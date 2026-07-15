output "vpc_id" {
  value       = module.vpc.vpc_id
  description = "The ID of the VPC"
}

output "private_subnets" {
  value       = module.vpc.private_subnets
  description = "List of private subnet IDs"
}

output "public_subnets" {
  value       = module.vpc.public_subnets
  description = "List of public subnet IDs"
}
