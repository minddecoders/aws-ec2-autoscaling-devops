
variable "aws_region" {
  type        = string
  description = "AWS region for this deployment"
  default     = "eu-west-1"
}

variable "project_name" {
  type        = string
  description = "Name used to identify project resources"
  default     = "aws-ec2-autoscaling-devops"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR range for the project VPC"
  default     = "10.20.0.0/16"
}

variable "subnets" {
  description = "Named subnet configurations for the development VPC"

  type = map(object({
    cidr_block = string
    tier       = string
    az_index   = number
  }))

  default = {
    public_a = {
      cidr_block = "10.20.1.0/24"
      tier       = "public"
      az_index   = 0
    }

    public_b = {
      cidr_block = "10.20.3.0/24"
      tier       = "public"
      az_index   = 1
    }

    private_a = {
      cidr_block = "10.20.2.0/24"
      tier       = "private"
      az_index   = 0
    }

    private_b = {
      cidr_block = "10.20.4.0/24"
      tier       = "private"
      az_index   = 1
    }
  }

  validation {
    condition = alltrue([
      for subnet in values(var.subnets) :
      contains(["public", "private"], subnet.tier) &&
      subnet.az_index >= 0 &&
      subnet.az_index <= 1
    ])

    error_message = "Each subnet must have a public or private tier and an AZ index of 0 or 1."
  }
}
variable "enable_compute" {
  description = "Whether to create the EC2 Auto Scaling compute layer"
  type        = bool
  default     = false
}

variable "image_tag" {
  description = "Immutable Git commit SHA tag of the Docker image to deploy"
  type        = string
  default     = ""
}
