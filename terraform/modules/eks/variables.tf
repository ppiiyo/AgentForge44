variable "cluster_name" {
  type        = string
  description = "Name of the EKS cluster"
}

variable "cluster_version" {
  type        = string
  description = "Kubernetes version for the cluster"
  default     = "1.29"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID where EKS is deployed"
}

variable "subnet_ids" {
  type        = list(string)
  description = "List of subnet IDs for EKS nodes"
}

variable "system_min_size" {
  type    = number
  default = 3
}

variable "system_max_size" {
  type    = number
  default = 5
}

variable "system_desired_size" {
  type    = number
  default = 3
}

variable "system_instance_types" {
  type    = list(string)
  default = ["m6i.large"]
}

variable "workloads_min_size" {
  type    = number
  default = 5
}

variable "workloads_max_size" {
  type    = number
  default = 50
}

variable "workloads_desired_size" {
  type    = number
  default = 5
}

variable "workloads_instance_types" {
  type    = list(string)
  default = ["c6i.xlarge"]
}
