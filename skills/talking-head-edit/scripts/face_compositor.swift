import AVFoundation
import CoreImage
import Darwin
import Foundation
import Vision

struct RenderError: LocalizedError {
    let errorDescription: String?
    init(_ message: String) { errorDescription = message }
}

struct Cue: Decodable {
    let start: Double
    let end: Double
    let file: String
}

struct CameraKeyframe: Decodable {
    let at: Double
    let scale: Double
    let focus: [Double]
}

struct Timeline: Decodable {
    let titles: [Cue]
    let captions: [Cue]
    let camera: [CameraKeyframe]
}

struct Layer {
    let cue: Cue
    let image: CIImage
}

func ease(_ progress: Double) -> Double {
    let value = min(1, max(0, progress))
    return value * value * (3 - 2 * value)
}

func activeLayer(_ layers: [Layer], at time: Double) -> Layer? {
    layers.first { $0.cue.start <= time && time < $0.cue.end }
}

func animate(_ layer: Layer, at time: Double, in extent: CGRect) -> CIImage {
    let duration = layer.cue.end - layer.cue.start
    let entry = ease((time - layer.cue.start) / min(0.29, duration * 0.28))
    let exit = ease((layer.cue.end - time) / min(0.11, duration * 0.18))
    let scale = 0.96 + 0.04 * entry
    let anchor = CGPoint(x: extent.midX, y: extent.height * 0.65)
    let transform = CGAffineTransform(
        a: scale, b: 0, c: 0, d: scale,
        tx: anchor.x * (1 - scale) - extent.width * 0.045 * (1 - entry),
        ty: anchor.y * (1 - scale) + extent.height * 0.064 * (1 - entry)
    )
    return layer.image.transformed(by: transform).applyingFilter(
        "CIColorMatrix", parameters: ["inputAVector": CIVector(x: 0, y: 0, z: 0, w: entry * exit)]
    )
}

func camera(_ frame: CIImage, at time: Double, keyframes: [CameraKeyframe], in extent: CGRect) -> CIImage {
    guard let final = keyframes.last else { return frame }
    var scale = final.scale
    var focus = final.focus
    if let next = keyframes.firstIndex(where: { $0.at > time }), next > 0 {
        let from = keyframes[next - 1]
        let to = keyframes[next]
        let progress = ease((time - from.at) / (to.at - from.at))
        scale = from.scale + (to.scale - from.scale) * progress
        focus = zip(from.focus, to.focus).map { $0 + ($1 - $0) * progress }
    }
    let transform = CGAffineTransform(
        a: scale, b: 0, c: 0, d: scale,
        tx: -(scale - 1) * extent.width * focus[0],
        ty: -(scale - 1) * extent.height * (1 - focus[1])
    )
    return frame.transformed(by: transform).cropped(to: extent)
}

let arguments = CommandLine.arguments
guard arguments.count == 4 else { throw RenderError("Expected source video, layer timeline, and output video.") }
let asset = AVURLAsset(url: URL(fileURLWithPath: arguments[1]))
guard let track = try await asset.loadTracks(withMediaType: .video).first else {
    throw RenderError("The source has no video track.")
}
let orientation = try await track.load(.preferredTransform)
guard orientation.isIdentity else { throw RenderError("Normalize the source orientation before rendering.") }
let size = try await track.load(.naturalSize)
let range = try await track.load(.timeRange)
let nominalFPS = Double(try await track.load(.nominalFrameRate))
let fps = nominalFPS > 0 ? nominalFPS : 30
let width = Int(size.width)
let height = Int(size.height)
let extent = CGRect(x: 0, y: 0, width: width, height: height)
let layerURL = URL(fileURLWithPath: arguments[2])
let timeline = try JSONDecoder().decode(Timeline.self, from: Data(contentsOf: layerURL))
let directory = layerURL.deletingLastPathComponent()
let initial = CameraKeyframe(at: 0, scale: 1, focus: [0.5, 0.4])
let keyframes = timeline.camera.first?.at == 0 ? timeline.camera : [initial] + timeline.camera

func loadLayers(_ cues: [Cue]) throws -> [Layer] {
    try cues.map { cue in
        guard let image = CIImage(contentsOf: directory.appendingPathComponent(cue.file)),
              image.extent.size == extent.size else {
            throw RenderError("Missing or incorrect-sized layer: \(cue.file)")
        }
        return Layer(cue: cue, image: image)
    }
}
let titles = try loadLayers(timeline.titles)
let captions = try loadLayers(timeline.captions)

let attributes: [String: Any] = [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
    kCVPixelBufferWidthKey as String: width,
    kCVPixelBufferHeightKey as String: height,
    kCVPixelBufferIOSurfacePropertiesKey as String: [:],
]
let reader = try AVAssetReader(asset: asset)
let decoded = AVAssetReaderTrackOutput(track: track, outputSettings: attributes)
decoded.alwaysCopiesSampleData = false
guard reader.canAdd(decoded) else { throw RenderError("Could not set up the video reader.") }
reader.add(decoded)

let writer = try AVAssetWriter(outputURL: URL(fileURLWithPath: arguments[3]), fileType: .mp4)
let bitRate = Int(min(35_000_000, max(900_000, Double(width) * Double(height) * fps * 0.15)))
let encoded = AVAssetWriterInput(mediaType: .video, outputSettings: [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: width,
    AVVideoHeightKey: height,
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: bitRate,
        AVVideoExpectedSourceFrameRateKey: Int(fps.rounded()),
    ],
    AVVideoColorPropertiesKey: [
        AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2,
        AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2,
        AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2,
    ],
])
let pixelWriter = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: encoded, sourcePixelBufferAttributes: attributes)
guard writer.canAdd(encoded) else { throw RenderError("Could not set up the video writer.") }
writer.add(encoded)
guard reader.startReading() else { throw reader.error ?? RenderError("Could not decode the source.") }
guard writer.startWriting() else { throw writer.error ?? RenderError("Could not start the export.") }
writer.startSession(atSourceTime: range.start)
guard let pool = pixelWriter.pixelBufferPool else { throw RenderError("Could not allocate video frames.") }
guard let colorSpace = CGColorSpace(name: CGColorSpace.itur_709) else { throw RenderError("Could not load Rec. 709.") }

let context = CIContext(options: [.cacheIntermediates: false])
let request = VNGeneratePersonSegmentationRequest()
request.qualityLevel = .balanced
request.outputPixelFormat = kCVPixelFormatType_OneComponent8
let tracker = VNSequenceRequestHandler()
let maskInterval = fps > 48 ? 2 : 1
var previousMask: CIImage?
var frameCount = 0

while let sample = decoded.copyNextSampleBuffer() {
    try autoreleasepool {
        guard let pixels = CMSampleBufferGetImageBuffer(sample) else { throw RenderError("Could not decode a frame.") }
        let timestamp = CMSampleBufferGetPresentationTimeStamp(sample)
        let time = max(0, CMTimeSubtract(timestamp, range.start).seconds)
        let source = CIImage(cvPixelBuffer: pixels)
        var shot = source
        if let title = activeLayer(titles, at: time) {
            if previousMask == nil || frameCount.isMultiple(of: maskInterval) {
                try tracker.perform([request], on: pixels, orientation: .up)
                guard let mask = request.results?.first?.pixelBuffer else { throw RenderError("Could not generate a person matte.") }
                let image = CIImage(cvPixelBuffer: mask)
                previousMask = image.transformed(by: CGAffineTransform(
                    scaleX: extent.width / image.extent.width, y: extent.height / image.extent.height
                ))
            }
            guard let mask = previousMask else { throw RenderError("Missing person matte.") }
            let titled = animate(title, at: time, in: extent).composited(over: source)
            shot = source.applyingFilter("CIBlendWithMask", parameters: [
                kCIInputBackgroundImageKey: titled,
                kCIInputMaskImageKey: mask,
            ])
        } else {
            previousMask = nil
        }
        shot = camera(shot, at: time, keyframes: keyframes, in: extent)
        if let caption = activeLayer(captions, at: time) { shot = caption.image.composited(over: shot) }

        let waitUntil = Date().addingTimeInterval(10)
        while !encoded.isReadyForMoreMediaData && writer.status == .writing && Date() < waitUntil {
            usleep(2000)
        }
        guard writer.status == .writing && encoded.isReadyForMoreMediaData else {
            throw writer.error ?? RenderError("The encoder stopped accepting frames.")
        }
        var output: CVPixelBuffer?
        guard CVPixelBufferPoolCreatePixelBuffer(kCFAllocatorDefault, pool, &output) == kCVReturnSuccess,
              let output else { throw RenderError("Could not allocate an output frame.") }
        context.render(shot.cropped(to: extent), to: output, bounds: extent, colorSpace: colorSpace)
        guard pixelWriter.append(output, withPresentationTime: timestamp) else {
            throw writer.error ?? RenderError("Could not encode a frame.")
        }
        frameCount += 1
    }
}
guard reader.status == .completed, frameCount > 0 else { throw reader.error ?? RenderError("Incomplete source decode.") }
writer.endSession(atSourceTime: CMTimeRangeGetEnd(range))
encoded.markAsFinished()
await writer.finishWriting()
guard writer.status == .completed else { throw writer.error ?? RenderError("The export did not finish.") }
