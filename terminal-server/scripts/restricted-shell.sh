#!/usr/bin/env bash

shopt -s extglob
PS1='mazen@testlab:~$ '
KUBECONFIG="${KUBECONFIG:-/tmp/visitor-kubeconfig.yaml}"

ALLOWED_LOCAL=(
  "ls" "cat" "echo" "pwd" "whoami" "uname" "uptime" "date"
  "df" "free" "ps" "env" "printenv" "which" "help" "clear" "exit"
  "jq" "curl" "ping"
)

ALLOWED_K8S_SUBCOMMANDS=(
  "get" "describe" "logs" "top" "version" "cluster-info" "api-resources"
)

BLOCKED_PATTERNS=(
  "sudo" "su " "bash" "sh " "python" "perl" "ruby" "nc " "ncat"
  "nmap" "wget" "/bin/" "/usr/bin/" "$(" "`" "|" ">" "<" ";" "&&" "||" "../"
)

trim() {
  local value="$*"
  value="${value##+([[:space:]])}"
  value="${value%%+([[:space:]])}"
  printf '%s' "$value"
}

log_command() {
  local entry="$1"
  printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$entry" >> /tmp/session.log 2>/dev/null || true
}

command_not_found() {
  printf 'bash: %s: command not found\n' "$1"
}

is_blocked() {
  local lower="${1,,}"
  for pattern in "${BLOCKED_PATTERNS[@]}"; do
    if [[ "$lower" == *"$pattern"* ]]; then
      return 0
    fi
  done
  return 1
}

print_help() {
  cat <<'EOF'
Available commands:
  System : ls, cat, echo, pwd, whoami, uname, uptime, date, df, free, ps
  K8s    : kubectl get|describe|logs|top|version|cluster-info [resource]
  Helm   : helm list, helm status <release>
  Info   : cat /etc/about.txt

This is a real K8s cluster. Read-only access. Have fun!
EOF
}

if [ -f /scripts/motd.sh ]; then
  /scripts/motd.sh
fi

while true; do
  if ! read -e -p "$PS1" raw_input; then
    echo
    break
  fi

  cmd="$(trim "$raw_input")"
  [ -z "$cmd" ] && continue

  log_command "$cmd"

  if is_blocked "$cmd"; then
    command_not_found "${cmd%% *}"
    continue
  fi

  IFS=' ' read -r -a argv <<< "$cmd"
  command_name="${argv[0]}"
  args=("${argv[@]:1}")

  case "$command_name" in
    help)
      print_help
      ;;
    whoami)
      echo "mazen@testlab"
      ;;
    exit|logout)
      break
      ;;
    kubectl)
      subcommand="${args[0]:-}"
      if [[ " ${ALLOWED_K8S_SUBCOMMANDS[*]} " == *" $subcommand "* ]]; then
        KUBECONFIG="$KUBECONFIG" kubectl "${args[@]}"
      else
        printf 'kubectl: subcommand "%s" is not allowed\n' "$subcommand"
      fi
      ;;
    helm)
      subcommand="${args[0]:-}"
      if [[ "$subcommand" == "list" || "$subcommand" == "status" ]]; then
        helm "${args[@]}"
      else
        printf 'helm: subcommand "%s" is not allowed\n' "$subcommand"
      fi
      ;;
    *)
      if [[ " ${ALLOWED_LOCAL[*]} " == *" $command_name "* ]]; then
        command "$command_name" "${args[@]}"
      else
        command_not_found "$command_name"
      fi
      ;;
  esac

done
