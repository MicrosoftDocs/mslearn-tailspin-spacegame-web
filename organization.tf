resource "aws_organizations_account" "account" {
  name      = "${var.cliente}"
  email     = "john@doe.org"
  role_name = "myOrganizationRole"

  # There is no AWS Organizations API for reading role_name
  lifecycle {
    ignore_changes = [role_name]
  }
}
