#!/usr/bin/env bash
set -euo pipefail

app_dir=$(realpath "${1:?Usage: test-appimage-startup.sh <extracted AppDir>}")
command -v qemu-x86_64 >/dev/null
command -v xdotool >/dev/null
test -x "$app_dir/usr/bin/InfloWave"

state_dir=$(mktemp -d)
app_pid=''
cleanup() {
  if [[ -n "$app_pid" ]]; then
    kill -TERM "$app_pid" 2>/dev/null || true
    wait "$app_pid" 2>/dev/null || true
  fi
  rm -rf "$state_dir"
}
trap cleanup EXIT

export APPDIR="$app_dir"
export XDG_CONFIG_HOME="$state_dir/config"
export XDG_CACHE_HOME="$state_dir/cache"
export XDG_DATA_HOME="$state_dir/data"
export XDG_DATA_DIRS="${XDG_DATA_DIRS:-/usr/local/share:/usr/share}"
export WEBKIT_DISABLE_DMABUF_RENDERER=1
export WEBKIT_DISABLE_COMPOSITING_MODE=1
export GDK_BACKEND=x11
source "$app_dir/apprun-hooks/linuxdeploy-plugin-gtk.sh"

# Nehalem has no AVX, so this also catches binaries optimized for the CI host.
# Pass bundled libraries to the emulated app, not to QEMU's own host process.
app_libraries="$app_dir/usr/lib:$app_dir/usr/lib/x86_64-linux-gnu:$app_dir/usr/lib64"
qemu-x86_64 -cpu Nehalem -E "LD_LIBRARY_PATH=$app_libraries" \
  "$app_dir/usr/bin/InfloWave" > "$state_dir/startup.log" 2>&1 &
app_pid=$!

for attempt in {1..40}; do
  sleep 1
  if ! kill -0 "$app_pid" 2>/dev/null; then
    status=0
    wait "$app_pid" || status=$?
    app_pid=''
    cat "$state_dir/startup.log"
    echo "AppImage startup failed on the baseline CPU (exit $status)" >&2
    exit 1
  fi
  if xdotool search --onlyvisible --pid "$app_pid" --name '^InfloWave$' >/dev/null 2>&1; then
    sleep 3
    if kill -0 "$app_pid" 2>/dev/null; then
      echo 'AppImage displayed its main window on the baseline CPU'
      exit 0
    fi
  fi
done

cat "$state_dir/startup.log"
echo 'AppImage did not display its main window within 40 seconds' >&2
exit 1
