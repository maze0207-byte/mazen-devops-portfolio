import { NextRequest, NextResponse } from "next/server"

// Configuration for your cluster connection
// Set these environment variables to connect to your real cluster:
// CLUSTER_API_URL - Your cluster API endpoint (e.g., Kubernetes API server)
// CLUSTER_TOKEN - Bearer token for authentication
// CLUSTER_SSH_HOST - SSH host for direct connection
// CLUSTER_SSH_USER - SSH username
// CLUSTER_SSH_KEY - SSH private key (base64 encoded)

const CLUSTER_API_URL = process.env.CLUSTER_API_URL
const CLUSTER_TOKEN = process.env.CLUSTER_TOKEN

interface CommandResponse {
  output: string
  exitCode: number
  timestamp: string
}

// Simulated responses for demo when no cluster is connected
const simulatedResponses: Record<string, string> = {
  // Kubernetes commands
  "kubectl get pods": `NAME                                    READY   STATUS    RESTARTS   AGE
nginx-deployment-7c5d8bfc77-4xvnp       1/1     Running   0          2d
nginx-deployment-7c5d8bfc77-8qj2x       1/1     Running   0          2d
nginx-deployment-7c5d8bfc77-kv9zt       1/1     Running   0          2d
redis-master-0                          1/1     Running   0          5d
redis-replica-0                         1/1     Running   0          5d
redis-replica-1                         1/1     Running   0          5d
api-gateway-5f8d6c7b4f-2nlqm           1/1     Running   0          1d
api-gateway-5f8d6c7b4f-9pmkr           1/1     Running   0          1d`,

  "kubectl get pods -A": `NAMESPACE     NAME                                       READY   STATUS    RESTARTS   AGE
default       nginx-deployment-7c5d8bfc77-4xvnp          1/1     Running   0          2d
default       nginx-deployment-7c5d8bfc77-8qj2x          1/1     Running   0          2d
default       api-gateway-5f8d6c7b4f-2nlqm              1/1     Running   0          1d
kube-system   coredns-5d78c9869d-4xvnp                   1/1     Running   0          10d
kube-system   coredns-5d78c9869d-8qj2x                   1/1     Running   0          10d
kube-system   etcd-master                                1/1     Running   0          10d
kube-system   kube-apiserver-master                      1/1     Running   0          10d
kube-system   kube-controller-manager-master             1/1     Running   0          10d
kube-system   kube-proxy-4xvnp                           1/1     Running   0          10d
kube-system   kube-scheduler-master                      1/1     Running   0          10d
monitoring    prometheus-server-6c5d8bfc77-4xvnp         1/1     Running   0          7d
monitoring    grafana-7c5d8bfc77-8qj2x                   1/1     Running   0          7d`,

  "kubectl get nodes": `NAME           STATUS   ROLES           AGE   VERSION
master-node    Ready    control-plane   30d   v1.29.2
worker-node1   Ready    worker          30d   v1.29.2
worker-node2   Ready    worker          30d   v1.29.2
worker-node3   Ready    worker          28d   v1.29.2`,

  "kubectl get services": `NAME           TYPE           CLUSTER-IP       EXTERNAL-IP     PORT(S)        AGE
kubernetes     ClusterIP      10.96.0.1        <none>          443/TCP        30d
nginx-svc      LoadBalancer   10.96.142.15     192.168.1.100   80:31234/TCP   2d
redis-master   ClusterIP      10.96.89.23      <none>          6379/TCP       5d
api-gateway    LoadBalancer   10.96.178.45     192.168.1.101   8080:32156/TCP 1d`,

  "kubectl get deployments": `NAME               READY   UP-TO-DATE   AVAILABLE   AGE
nginx-deployment   3/3     3            3           2d
api-gateway        2/2     2            2           1d
redis-replica      2/2     2            2           5d`,

  "kubectl get namespaces": `NAME              STATUS   AGE
default           Active   30d
kube-system       Active   30d
kube-public       Active   30d
kube-node-lease   Active   30d
monitoring        Active   7d
production        Active   5d
staging           Active   5d`,

  "kubectl cluster-info": `Kubernetes control plane is running at https://192.168.1.10:6443
CoreDNS is running at https://192.168.1.10:6443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy
Metrics-server is running at https://192.168.1.10:6443/api/v1/namespaces/kube-system/services/https:metrics-server:https/proxy

To further debug and diagnose cluster problems, use 'kubectl cluster-info dump'.`,

  "kubectl version": `Client Version: v1.29.2
Kustomize Version: v5.0.4-0.20230601165947-6ce0bf390ce3
Server Version: v1.29.2`,

  "kubectl top nodes": `NAME           CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%
master-node    256m         12%    1024Mi          26%
worker-node1   512m         25%    2048Mi          52%
worker-node2   384m         19%    1536Mi          39%
worker-node3   448m         22%    1792Mi          46%`,

  "kubectl top pods": `NAME                                    CPU(cores)   MEMORY(bytes)
nginx-deployment-7c5d8bfc77-4xvnp       10m          64Mi
nginx-deployment-7c5d8bfc77-8qj2x       12m          68Mi
nginx-deployment-7c5d8bfc77-kv9zt       8m           62Mi
redis-master-0                          25m          128Mi
api-gateway-5f8d6c7b4f-2nlqm           45m          256Mi`,

  // Docker commands
  "docker ps": `CONTAINER ID   IMAGE                  COMMAND                  CREATED       STATUS       PORTS                    NAMES
a1b2c3d4e5f6   nginx:latest           "/docker-entrypoint.…"   2 days ago    Up 2 days    0.0.0.0:80->80/tcp       nginx-proxy
b2c3d4e5f6a7   redis:7-alpine         "docker-entrypoint.s…"   5 days ago    Up 5 days    0.0.0.0:6379->6379/tcp   redis-cache
c3d4e5f6a7b8   postgres:15            "docker-entrypoint.s…"   1 week ago    Up 1 week    0.0.0.0:5432->5432/tcp   postgres-db
d4e5f6a7b8c9   grafana/grafana:latest "/run.sh"                7 days ago    Up 7 days    0.0.0.0:3000->3000/tcp   grafana`,

  "docker images": `REPOSITORY          TAG       IMAGE ID       CREATED        SIZE
nginx               latest    a6bd71f48f68   2 weeks ago    187MB
redis               7-alpine  8e69fcb59ff1   3 weeks ago    40.2MB
postgres            15        5f7385c9f9d2   1 month ago    379MB
grafana/grafana     latest    a8c38d4c0c8e   2 weeks ago    422MB
node                20-slim   8f3d8c3b6e3f   1 week ago     244MB
python              3.11-slim 2d8b5c4e3f6a   2 weeks ago    155MB`,

  "docker-compose ps": `NAME                SERVICE             STATUS              PORTS
app-nginx-1         nginx               running             0.0.0.0:80->80/tcp
app-redis-1         redis               running             0.0.0.0:6379->6379/tcp
app-postgres-1      postgres            running             0.0.0.0:5432->5432/tcp
app-api-1           api                 running             0.0.0.0:8080->8080/tcp`,

  "docker stats --no-stream": `CONTAINER ID   NAME           CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O
a1b2c3d4e5f6   nginx-proxy    0.15%     32.5MiB / 4GiB        0.79%     1.2GB / 890MB     0B / 0B
b2c3d4e5f6a7   redis-cache    0.25%     45.2MiB / 4GiB        1.10%     256MB / 128MB     0B / 512KB
c3d4e5f6a7b8   postgres-db    1.20%     256MiB / 4GiB         6.25%     512MB / 256MB     4MB / 8MB`,

  // Terraform commands
  "terraform version": `Terraform v1.7.4
on linux_amd64

Your version of Terraform is out of date! The latest version
is 1.7.5. You can update by downloading from https://www.terraform.io/downloads.html`,

  "terraform state list": `aws_instance.web_server
aws_instance.api_server
aws_security_group.web_sg
aws_security_group.api_sg
aws_vpc.main
aws_subnet.public
aws_subnet.private
aws_internet_gateway.main
aws_nat_gateway.main
aws_route_table.public
aws_route_table.private
aws_db_instance.postgres
aws_elasticache_cluster.redis`,

  "terraform plan": `Terraform will perform the following actions:

  # aws_instance.web_server will be updated in-place
  ~ resource "aws_instance" "web_server" {
        id                                   = "i-0abc123def456789"
      ~ instance_type                        = "t3.micro" -> "t3.small"
        tags                                 = {
            "Name" = "web-server-prod"
        }
        # (20 unchanged attributes hidden)
    }

Plan: 0 to add, 1 to change, 0 to destroy.`,

  "terraform show": `# aws_instance.web_server:
resource "aws_instance" "web_server" {
    ami                          = "ami-0c55b159cbfafe1f0"
    instance_type                = "t3.micro"
    availability_zone            = "us-east-1a"
    vpc_security_group_ids       = ["sg-0abc123def456789"]
    subnet_id                    = "subnet-0abc123def456789"
    
    tags = {
        Name        = "web-server-prod"
        Environment = "production"
        ManagedBy   = "terraform"
    }
}

# aws_vpc.main:
resource "aws_vpc" "main" {
    cidr_block           = "10.0.0.0/16"
    enable_dns_hostnames = true
    enable_dns_support   = true
    
    tags = {
        Name = "main-vpc"
    }
}`,

  "terraform workspace list": `  default
* production
  staging
  development`,

  // System commands
  "whoami": "devops-admin",
  "hostname": "k8s-master-node-01",
  "uptime": " 14:32:15 up 30 days, 4:21, 2 users, load average: 0.52, 0.58, 0.59",
  "date": new Date().toUTCString(),
  "pwd": "/home/devops-admin",
  
  "cat /etc/os-release": `NAME="Ubuntu"
VERSION="22.04.3 LTS (Jammy Jellyfish)"
ID=ubuntu
ID_LIKE=debian
PRETTY_NAME="Ubuntu 22.04.3 LTS"
VERSION_ID="22.04"
HOME_URL="https://www.ubuntu.com/"
SUPPORT_URL="https://help.ubuntu.com/"`,

  "df -h": `Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1       100G   45G   55G  45% /
/dev/sdb1       500G  234G  266G  47% /data
tmpfs           7.8G  1.2M  7.8G   1% /run
tmpfs           7.8G     0  7.8G   0% /sys/fs/cgroup`,

  "free -h": `              total        used        free      shared  buff/cache   available
Mem:           15Gi       6.2Gi       2.1Gi       256Mi       7.1Gi       8.5Gi
Swap:         2.0Gi       128Mi       1.9Gi`,

  "help": `Available Commands:
────────────────────────────────────────────────────────────────

KUBERNETES (kubectl)
  kubectl get pods [-A]      List pods in current/all namespaces
  kubectl get nodes          List cluster nodes
  kubectl get services       List services
  kubectl get deployments    List deployments
  kubectl get namespaces     List namespaces
  kubectl cluster-info       Display cluster info
  kubectl version            Show kubectl version
  kubectl top nodes          Show node resource usage
  kubectl top pods           Show pod resource usage

DOCKER
  docker ps                  List running containers
  docker images              List images
  docker-compose ps          List compose services
  docker stats --no-stream   Show container stats

TERRAFORM
  terraform version          Show terraform version
  terraform state list       List resources in state
  terraform plan             Show execution plan
  terraform show             Show current state
  terraform workspace list   List workspaces

SYSTEM
  whoami                     Current user
  hostname                   System hostname
  uptime                     System uptime
  date                       Current date/time
  df -h                      Disk usage
  free -h                    Memory usage
  clear                      Clear terminal

Type any command to execute it on the cluster.`,

  "clear": "__CLEAR__",
}

// Function to execute command on real cluster (when configured)
async function executeOnCluster(command: string): Promise<CommandResponse> {
  if (!CLUSTER_API_URL || !CLUSTER_TOKEN) {
    // No cluster configured, use simulated responses
    return executeSimulated(command)
  }

  try {
    // For Kubernetes API calls
    if (command.startsWith("kubectl")) {
      const response = await fetch(`${CLUSTER_API_URL}/api/v1/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${CLUSTER_TOKEN}`,
        },
        body: JSON.stringify({ command }),
      })

      if (!response.ok) {
        throw new Error(`Cluster API error: ${response.statusText}`)
      }

      const data = await response.json()
      return {
        output: data.output,
        exitCode: data.exitCode || 0,
        timestamp: new Date().toISOString(),
      }
    }

    // Fallback to simulated for non-kubectl commands when no full shell access
    return executeSimulated(command)
  } catch (error) {
    console.error("Cluster execution error:", error)
    return {
      output: `Error connecting to cluster: ${error instanceof Error ? error.message : "Unknown error"}\nFalling back to demo mode...`,
      exitCode: 1,
      timestamp: new Date().toISOString(),
    }
  }
}

// Simulated command execution for demo purposes
function executeSimulated(command: string): CommandResponse {
  const trimmedCommand = command.trim().toLowerCase()
  
  // Check for exact matches first
  for (const [key, value] of Object.entries(simulatedResponses)) {
    if (trimmedCommand === key.toLowerCase()) {
      return {
        output: value,
        exitCode: 0,
        timestamp: new Date().toISOString(),
      }
    }
  }

  // Check for partial matches (commands that start with known prefixes)
  if (trimmedCommand.startsWith("kubectl")) {
    // Handle kubectl logs
    if (trimmedCommand.includes("logs")) {
      return {
        output: `[2024-03-15T10:30:45.123Z] INFO: Application started successfully
[2024-03-15T10:30:45.234Z] INFO: Connected to database
[2024-03-15T10:30:46.345Z] INFO: Health check endpoint ready
[2024-03-15T10:31:00.456Z] INFO: Received request GET /api/health
[2024-03-15T10:31:00.567Z] INFO: Response sent: 200 OK
[2024-03-15T10:32:15.678Z] INFO: Received request POST /api/data
[2024-03-15T10:32:15.789Z] INFO: Processing data batch...
[2024-03-15T10:32:16.890Z] INFO: Data batch processed successfully`,
        exitCode: 0,
        timestamp: new Date().toISOString(),
      }
    }
    
    // Handle kubectl describe
    if (trimmedCommand.includes("describe")) {
      return {
        output: `Name:         nginx-deployment-7c5d8bfc77-4xvnp
Namespace:    default
Priority:     0
Node:         worker-node1/192.168.1.11
Start Time:   Mon, 13 Mar 2024 10:30:45 +0000
Labels:       app=nginx
              pod-template-hash=7c5d8bfc77
Status:       Running
IP:           10.244.1.45
Containers:
  nginx:
    Container ID:   containerd://abc123...
    Image:          nginx:1.25
    Port:           80/TCP
    State:          Running
      Started:      Mon, 13 Mar 2024 10:30:50 +0000
    Ready:          True
    Restart Count:  0
Events:           <none>`,
        exitCode: 0,
        timestamp: new Date().toISOString(),
      }
    }

    return {
      output: `Command not found in demo mode. Try 'help' for available commands.`,
      exitCode: 1,
      timestamp: new Date().toISOString(),
    }
  }

  if (trimmedCommand.startsWith("docker")) {
    return {
      output: `Command not found in demo mode. Try 'help' for available commands.`,
      exitCode: 1,
      timestamp: new Date().toISOString(),
    }
  }

  if (trimmedCommand.startsWith("terraform")) {
    return {
      output: `Command not found in demo mode. Try 'help' for available commands.`,
      exitCode: 1,
      timestamp: new Date().toISOString(),
    }
  }

  // Unknown command
  return {
    output: `bash: ${command}: command not found\nType 'help' for available commands.`,
    exitCode: 127,
    timestamp: new Date().toISOString(),
  }
}

export async function POST(request: NextRequest) {
  try {
    const { command } = await request.json()

    if (!command || typeof command !== "string") {
      return NextResponse.json(
        { error: "Invalid command" },
        { status: 400 }
      )
    }

    // Sanitize command (basic security)
    const sanitizedCommand = command.trim().slice(0, 500)
    
    // Execute command
    const result = await executeOnCluster(sanitizedCommand)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Terminal API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET() {
  // Health check and connection status
  const isConnected = !!(CLUSTER_API_URL && CLUSTER_TOKEN)
  
  return NextResponse.json({
    status: "ok",
    clusterConnected: isConnected,
    mode: isConnected ? "live" : "demo",
    timestamp: new Date().toISOString(),
  })
}
