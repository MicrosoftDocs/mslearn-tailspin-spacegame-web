output "url" {
    value = "${azurerm_windows_web_app.game-demo-wa.default_hostname}.azurewebsites.net"
}