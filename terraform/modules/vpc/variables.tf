variable "vpc_name" {
  type        = string
  description = "Name of the VPC"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR range of the VPC"
}

variable "azs" {
  type        = list(string)
  description = "Availability Zones"
}

variable "private_subnets" {
  type        = list(string)
  description = "Private Subnets"
}

variable "public_subnets" {
  type        = list(string)
  description = "Public Subnets"
}

variable "cluster_name" {
  type        = string
  description = "EKS cluster name for subnet tagging"
}
