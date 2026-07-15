variable "aws_region" {
  type        = string
  description = "Target deployment region"
  default     = "us-east-1"
}

variable "database_password" {
  type        = string
  description = "Production database password"
  sensitive   = true
}
