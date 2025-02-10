terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~>4.12.0"
    }
  }
  backend "azurerm" {
      resource_group_name  = "tfstate"
      storage_account_name = "tfstatestgacct27555"
      container_name       = "tfstate"
      key                  = "game-demo.tfstate"
  }

}

provider "azurerm" {
  features {}
  resource_provider_registrations = "none"
  subscription_id = "06f912fd-467a-4021-9dd4-5b5cd9d41551"
}

# Resource Group
resource "azurerm_resource_group" "game-demo" {
  name     = "game-demo-rg"
  location = "East US 2"
}

# App Service Plan
resource "azurerm_service_plan" "game-demo-asp" {
  name                = "game-demo-appservice-plan"
  location            = azurerm_resource_group.game-demo.location
  resource_group_name = azurerm_resource_group.game-demo.name
  os_type             = "Windows"
  sku_name            = "F1"
}

#data "archive_file" "app_package" {
#  type        = "zip"
#  source_dir  = "${path.module}/path/to/your/application/code"
#  output_path = "${path.module}/app_package.zip"
#}

# App Service
resource "azurerm_windows_web_app" "game-demo-wa" {
  name                = "game-demo-webapp"
  location            = azurerm_resource_group.game-demo.location
  resource_group_name = azurerm_resource_group.game-demo.name
  service_plan_id     = azurerm_service_plan.game-demo-asp.id

  site_config {
    always_on = false
  }

  #zip_deploy_file = "/home/vsts/work/1/a/game-demo-drop/Release/Tailspin.SpaceGame.Web.zip"
  #zip_deploy_file = "/home/vsts/work/1/a/game-demo-drop/Release/Tailspin.SpaceGame.Web_${filemd5("./helloworld")}.zip"
  zip_deploy_file = "./Tailspin.SpaceGame.Web.1.zip"
  lifecycle {
    create_before_destroy = true
  }

  app_settings = {
    "WEBSITE_RUN_FROM_PACKAGE" = "1"
  }
}

# Storage Account
resource "azurerm_storage_account" "game-demo-sa" {
  name                     = "gamedemostgacct"
  resource_group_name      = azurerm_resource_group.game-demo.name
  location                 = azurerm_resource_group.game-demo.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

# Storage Container
resource "azurerm_storage_container" "game-demo-sc" {
  name                  = "game-demo-appservice-zip"
  storage_account_id    = azurerm_storage_account.game-demo-sa.id
  container_access_type = "private"
}

# Storage Blob (ZIP File)
resource "azurerm_storage_blob" "game-demo-sb" {
  name                   = "game-demo-example.zip"
  storage_account_name   = azurerm_storage_account.game-demo-sa.name
  storage_container_name = azurerm_storage_container.game-demo-sc.name
  type                   = "Block"
  source                 = "/home/vsts/work/1/a/game-demo-drop/Release/Tailspin.SpaceGame.Web.zip"
}

# Deploy ZIP to App Service
#resource "azurerm_app_service_source_control" "game-demo-wasc" {
#  app_id     = azurerm_windows_web_app.game-demo-wa.id
#  branch     = "master"
#  repo_url   = azurerm_storage_blob.game-demo-sb.url
#}
