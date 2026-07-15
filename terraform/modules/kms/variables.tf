variable "description" {
  type        = string
  description = "Description of the KMS key"
  default     = "KMS Key for encryption at rest"
}

variable "deletion_window_in_days" {
  type        = number
  description = "KMS deletion window duration in days"
  default     = 30
}

variable "environment" {
  type        = string
  description = "Target deployment environment"
}

variable "application_name" {
  type        = string
  description = "Target application identifier"
}
