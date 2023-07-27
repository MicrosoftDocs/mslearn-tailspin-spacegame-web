terraform {
  backend "azurerm" {
    resource_group_name = "Appserver-RG"
    storage_account_name = "cicdestorage"
    container_name = "terraform"
    key = "terraform.terraform"
    access_key = "CyAvuoT8SNy3A1nQ77XeywVufA/IqgiMKoFojJpngn2pnMAYGskB/f0RsTGt9VQ61/VaxTp9RgOB+AStyagDvQ=="
  }  
}
provider "azurerm" {
    features {
      
    }
    subscription_id = var.subscription_id
    client_id = var.client_id
    client_secret = var.client_secret
    tenant_id = var.tenant_id

  
}
locals {
  setup_name = "practice-hyd"
}
resource "azurerm_resource_group" "appservicerglabel1" {
    name = "appservicerg1287"
    location = "East US"
    tags = {
      "name" = "${local.setup_name}-rsg"
    }
}
resource "azurerm_app_service_plan" "appplanlabel11" {
    name = "appplan11"
    location = azurerm_resource_group.appservicerglabel1.location
    resource_group_name = azurerm_resource_group.appservicerglabel1.name
    sku {
        tier = "standard"
        size = "S1"
    }
    depends_on = [
      azurerm_resource_group.appservicerglabel1
    ]
    tags = {
      "name" = "${local.setup_name}-appplan"
    }
  
}
resource "azurerm_app_service" "webapplabell1" {
    name = "webapp12581"
    resource_group_name = azurerm_resource_group.appservicerglabel1.name
    location = azurerm_resource_group.appservicerglabel1.location
    app_service_plan_id = azurerm_app_service_plan.appplanlabel11.id
    depends_on = [
      azurerm_app_service_plan.appplanlabel11
    ]
    tags = {
      "name" = "${local.setup_name}-webapp"
    }
  
}