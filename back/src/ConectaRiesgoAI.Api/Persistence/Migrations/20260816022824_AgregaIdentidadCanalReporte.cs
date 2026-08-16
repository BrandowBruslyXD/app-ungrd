using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ConectaRiesgoAI.Api.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AgregaIdentidadCanalReporte : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "IdentificadorCanal",
                table: "reportes",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ReferenciaExterna",
                table: "reportes",
                type: "character varying(160)",
                maxLength: 160,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_reportes_Canal_ReferenciaExterna",
                table: "reportes",
                columns: new[] { "Canal", "ReferenciaExterna" },
                unique: true,
                filter: "\"ReferenciaExterna\" IS NOT NULL");

            // Backfill según canal: web usa usuario:{id}; WhatsApp/teléfono usan el teléfono del usuario.
            migrationBuilder.Sql(
                """
                UPDATE reportes r
                SET "IdentificadorCanal" = CASE
                    WHEN r."Canal" IN ('WhatsApp', 'Telefono')
                         AND u."Telefono" IS NOT NULL THEN u."Telefono"
                    ELSE 'usuario:' || r."UsuarioId"::text
                END
                FROM usuarios u
                WHERE r."UsuarioId" = u."Id"
                  AND r."IdentificadorCanal" = '';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_reportes_Canal_ReferenciaExterna",
                table: "reportes");

            migrationBuilder.DropColumn(
                name: "IdentificadorCanal",
                table: "reportes");

            migrationBuilder.DropColumn(
                name: "ReferenciaExterna",
                table: "reportes");
        }
    }
}
