#!/usr/bin/env bash
# Aprovisiona Azure Blob Storage para ConectaRiesgoAI (issue #47).
#
# Ejecución manual, una sola vez, por quien tenga el rol de Infra — igual que se hizo con
# PostgreSQL, el Azure Container Registry y el Container App (ver docs/CONTROL.md, decisión D15).
# No hay IaC (Bicep/Terraform) en este repo todavía; introducirla ahora, sin que nada más la
# use, sería ceremonia sin necesidad real en un hackatón con horas contadas.
#
# Requiere: az cli autenticado (`az login`) contra la suscripción correcta.
set -euo pipefail

RESOURCE_GROUP="conectariesgoai-rg"
LOCATION="brazilsouth"
STORAGE_ACCOUNT="conectariesgoaist"
CONTAINER_APP="conectariesgoai-api"

echo "== Creando la cuenta de almacenamiento ($STORAGE_ACCOUNT) =="
az storage account create \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot \
  --allow-blob-public-access false \
  --min-tls-version TLS1_2

echo "== Obteniendo la cadena de conexión (no se imprime) =="
CONN_STRING=$(az storage account show-connection-string \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --query connectionString -o tsv)

echo "== Creando los contenedores privados =="
# --public-access off: ni el contenedor ni sus blobs son accesibles sin firma (Ley 1581).
az storage container create \
  --name evidencias --account-name "$STORAGE_ACCOUNT" --auth-mode login --public-access off
az storage container create \
  --name censo --account-name "$STORAGE_ACCOUNT" --auth-mode login --public-access off

echo "== Guardando la cadena de conexión como secreto del Container App =="
# Como secreto, no como variable de entorno plana: contiene la clave de la cuenta.
az containerapp secret set \
  --name "$CONTAINER_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --secrets azure-storage-conn="$CONN_STRING"

az containerapp update \
  --name "$CONTAINER_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --set-env-vars "ConnectionStrings__AzureStorage=secretref:azure-storage-conn"

echo "== Listo. Verificar con: =="
echo "az storage container show --name evidencias --account-name $STORAGE_ACCOUNT --auth-mode login"
echo "az storage container show --name censo --account-name $STORAGE_ACCOUNT --auth-mode login"
