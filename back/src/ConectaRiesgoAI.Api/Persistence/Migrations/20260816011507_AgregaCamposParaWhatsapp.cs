using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ConectaRiesgoAI.Api.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AgregaCamposParaWhatsapp : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "EsAcreditadoCenso",
                table: "usuarios",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "OrigenRegistro",
                table: "usuarios",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Web");

            migrationBuilder.AddColumn<string>(
                name: "Telefono",
                table: "usuarios",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AlterColumn<double>(
                name: "Longitud",
                table: "reportes",
                type: "double precision",
                nullable: true,
                oldClrType: typeof(double),
                oldType: "double precision");

            migrationBuilder.AlterColumn<double>(
                name: "Latitud",
                table: "reportes",
                type: "double precision",
                nullable: true,
                oldClrType: typeof(double),
                oldType: "double precision");

            migrationBuilder.AddColumn<string>(
                name: "Canal",
                table: "reportes",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Web");

            migrationBuilder.AddColumn<string>(
                name: "Clase",
                table: "reportes",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "AfectacionPropia");

            migrationBuilder.AddColumn<string>(
                name: "Confianza",
                table: "reportes",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Autorreportado");

            migrationBuilder.AddColumn<string>(
                name: "UbicacionTexto",
                table: "reportes",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.UpdateData(
                table: "usuarios",
                keyColumn: "Id",
                keyValue: 1,
                column: "Telefono",
                value: null);

            migrationBuilder.UpdateData(
                table: "usuarios",
                keyColumn: "Id",
                keyValue: 2,
                column: "Telefono",
                value: null);

            migrationBuilder.UpdateData(
                table: "usuarios",
                keyColumn: "Id",
                keyValue: 3,
                column: "Telefono",
                value: null);

            migrationBuilder.CreateIndex(
                name: "IX_usuarios_Telefono",
                table: "usuarios",
                column: "Telefono",
                unique: true);
        }

        /// <inheritdoc />
        /// <remarks>
        /// Revertir con reportes de WhatsApp ya guardados (Latitud/Longitud nulas) falla en Postgres:
        /// vuelven a NOT NULL sin backfill. No es un problema hoy porque el Down() de este proyecto
        /// no se ejecuta en producción, pero si algún día se automatiza el rollback, hay que decidir
        /// primero qué coordenada poner en esas filas.
        /// </remarks>
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_usuarios_Telefono",
                table: "usuarios");

            migrationBuilder.DropColumn(
                name: "EsAcreditadoCenso",
                table: "usuarios");

            migrationBuilder.DropColumn(
                name: "OrigenRegistro",
                table: "usuarios");

            migrationBuilder.DropColumn(
                name: "Telefono",
                table: "usuarios");

            migrationBuilder.DropColumn(
                name: "Canal",
                table: "reportes");

            migrationBuilder.DropColumn(
                name: "Clase",
                table: "reportes");

            migrationBuilder.DropColumn(
                name: "Confianza",
                table: "reportes");

            migrationBuilder.DropColumn(
                name: "UbicacionTexto",
                table: "reportes");

            migrationBuilder.AlterColumn<double>(
                name: "Longitud",
                table: "reportes",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0,
                oldClrType: typeof(double),
                oldType: "double precision",
                oldNullable: true);

            migrationBuilder.AlterColumn<double>(
                name: "Latitud",
                table: "reportes",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0,
                oldClrType: typeof(double),
                oldType: "double precision",
                oldNullable: true);
        }
    }
}
