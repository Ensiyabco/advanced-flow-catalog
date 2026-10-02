import SwiftUI

@main
struct EnsiyabcoCatalogApp: App {
    var body: some Scene {
        WindowGroup {
            CatalogWebView()
                .ignoresSafeArea(edges: .bottom)
        }
    }
}
