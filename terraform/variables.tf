variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "Region context for all target provision assets"
}

variable "database_password" {
  type        = string
  sensitive   = true
  description = "Master password setup for PostgreSQL database"
}
