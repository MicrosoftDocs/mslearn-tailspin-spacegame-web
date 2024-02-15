terraform {
  backend "s3" {
    bucket = "terraform-stoque-cloudwatch-teste"
    region = "us-east-1"
    key = "teste"
  }
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.25.0"
    }
  }
  required_version = ">= 1.2.0"
}

provider "aws" {
  region = "us-east-1"
  profile = "pessoal"
}
