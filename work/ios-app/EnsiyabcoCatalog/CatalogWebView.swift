import SwiftUI
import WebKit

struct CatalogWebView: UIViewRepresentable {
    private let catalogURL = URL(string: "https://ensiyabco.github.io/advanced-flow-catalog/")!

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = false

        let view = WKWebView(frame: .zero, configuration: configuration)
        view.navigationDelegate = context.coordinator
        view.uiDelegate = context.coordinator
        view.allowsBackForwardNavigationGestures = true
        view.load(URLRequest(url: catalogURL))
        context.coordinator.webView = view
        return view
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        weak var webView: WKWebView?
        private var imagePickerDelegate: ImagePickerDelegate?

        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.cancel)
                return
            }

            if url.host == "ensiyabco.github.io" {
                decisionHandler(.allow)
            } else {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
            }
        }

        func webView(_ webView: WKWebView, runOpenPanelWith parameters: WKOpenPanelParameters, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping ([URL]?) -> Void) {
            let picker = UIImagePickerController()
            picker.sourceType = .photoLibrary
            picker.mediaTypes = ["public.image"]
            let delegate = ImagePickerDelegate(completionHandler: completionHandler) { [weak self] in
                self?.imagePickerDelegate = nil
            }
            imagePickerDelegate = delegate
            picker.delegate = delegate
            picker.allowsEditing = false
            picker.modalPresentationStyle = .fullScreen
            guard let controller = webView.closestViewController else {
                completionHandler(nil)
                return
            }
            controller.present(picker, animated: true)
        }
    }
}

private final class ImagePickerDelegate: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
    private let completionHandler: ([URL]?) -> Void
    private let onFinish: () -> Void

    init(completionHandler: @escaping ([URL]?) -> Void, onFinish: @escaping () -> Void) {
        self.completionHandler = completionHandler
        self.onFinish = onFinish
    }

    func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        picker.dismiss(animated: true) {
            self.completionHandler(nil)
            self.onFinish()
        }
    }

    func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
        let url = info[.imageURL] as? URL
        picker.dismiss(animated: true) {
            self.completionHandler(url.map { [$0] })
            self.onFinish()
        }
    }
}

private extension UIView {
    var closestViewController: UIViewController? {
        var responder: UIResponder? = self
        while let current = responder {
            if let controller = current as? UIViewController { return controller }
            responder = current.next
        }
        return nil
    }
}
