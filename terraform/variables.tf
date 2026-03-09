variable "aws_region" {
  description = "The AWS region to deploy to"
  type        = string
  default     = "us-east-1"
}

variable "docker_image" {
  description = "The container image to run (e.g., ghcr.io/username/credpal-node-app)"
  type        = string
  default     = "ghcr.io/yourusername/credpal-node-app"
}

variable "image_tag" {
  description = "The tag of the container image to run"
  type        = string
  default     = "latest"
}

variable "acm_certificate_arn" {
  description = "The ARN of the ACM certificate for HTTPS"
  type        = string
  default     = ""
}
