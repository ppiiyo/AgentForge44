module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = var.cluster_name
  cluster_version = var.cluster_version

  cluster_endpoint_public_access = true

  vpc_id     = var.vpc_id
  subnet_ids = var.subnet_ids

  eks_managed_node_groups = {
    system = {
      min_size     = var.system_min_size
      max_size     = var.system_max_size
      desired_size = var.system_desired_size

      instance_types = var.system_instance_types
      capacity_type  = "ON_DEMAND"
    }
    workloads = {
      min_size     = var.workloads_min_size
      max_size     = var.workloads_max_size
      desired_size = var.workloads_desired_size

      instance_types = var.workloads_instance_types
      capacity_type  = "ON_DEMAND"
    }
  }
}
