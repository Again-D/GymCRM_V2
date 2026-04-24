#!/bin/sh
set -eu

: "${NGINX_HOSTNAME:?NGINX_HOSTNAME is required}"

https_template="/etc/nginx/templates/https.conf.template"
bootstrap_template="/etc/nginx/templates/bootstrap.conf.template"
target_config="/etc/nginx/conf.d/default.conf"
cert_dir="/etc/letsencrypt/live/${NGINX_HOSTNAME}"
reload_signal="/var/www/certbot/.certbot-reload"
reload_state_file="/tmp/gymcrm-nginx-last-reload"

render_config() {
  envsubst '${NGINX_HOSTNAME}' < "$1" > "${target_config}"
}

current_mode="bootstrap"

if [ -s "${cert_dir}/fullchain.pem" ] && [ -s "${cert_dir}/privkey.pem" ]; then
  current_mode="https"
  echo "[entrypoint] Found Let's Encrypt certificate for ${NGINX_HOSTNAME}; enabling HTTPS"
  render_config "${https_template}"
else
  echo "[entrypoint] Certificate for ${NGINX_HOSTNAME} not found yet; starting in HTTP bootstrap mode"
  render_config "${bootstrap_template}"
fi

nginx -g 'daemon off;' &
nginx_pid=$!

while kill -0 "${nginx_pid}" 2>/dev/null; do
  next_mode="bootstrap"
  if [ -s "${cert_dir}/fullchain.pem" ] && [ -s "${cert_dir}/privkey.pem" ]; then
    next_mode="https"
  fi

  if [ "${next_mode}" != "${current_mode}" ]; then
    current_mode="${next_mode}"
    if [ "${current_mode}" = "https" ]; then
      echo "[entrypoint] Certificate became available; switching nginx to HTTPS mode"
      render_config "${https_template}"
    else
      echo "[entrypoint] Certificate files disappeared; switching nginx to HTTP bootstrap mode"
      render_config "${bootstrap_template}"
    fi
    nginx -s reload
  elif [ "${current_mode}" = "https" ] && [ -f "${reload_signal}" ]; then
    signal_value=$(cat "${reload_signal}" 2>/dev/null || true)
    last_signal_value=""
    if [ -f "${reload_state_file}" ]; then
      last_signal_value=$(cat "${reload_state_file}" 2>/dev/null || true)
    fi

    if [ -n "${signal_value}" ] && [ "${signal_value}" != "${last_signal_value}" ]; then
      echo "[entrypoint] Detected certificate renewal signal; reloading nginx"
      render_config "${https_template}"
      nginx -s reload
      printf '%s' "${signal_value}" > "${reload_state_file}"
    fi
  fi

  sleep 30
done

wait "${nginx_pid}"
