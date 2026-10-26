terraform {
  required_version = ">= 1.10.0"

  backend "s3" {
    bucket       = "aws-ec2-autoscaling-devops-2026"
    key          = "dev/terraform.tfstate"
    region       = "eu-west-1"
    encrypt      = true
    use_lockfile = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0, < 7.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}