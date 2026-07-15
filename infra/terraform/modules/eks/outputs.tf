output "cluster_arn" {
  value       = module.eks.cluster_arn
  description = "The EKS cluster ARN"
}

output "cluster_name" {
  value       = module.eks.cluster_name
  description = "The EKS cluster name"
}

output "cluster_endpoint" {
  value       = module.eks.cluster_endpoint
  description = "The EKS endpoint URL"
}

output "node_security_group_id" {
  value       = module.eks.node_security_group_id
  description = "Security Group ID of the worker nodes"
}
