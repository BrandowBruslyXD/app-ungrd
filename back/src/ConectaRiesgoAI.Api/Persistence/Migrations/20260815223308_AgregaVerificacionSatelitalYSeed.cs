using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace ConectaRiesgoAI.Api.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AgregaVerificacionSatelitalYSeed : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "verificaciones_satelitales",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ReporteId = table.Column<int>(type: "integer", nullable: false),
                    Fuente = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    Confirmado = table.Column<bool>(type: "boolean", nullable: false),
                    FocosDetectados = table.Column<int>(type: "integer", nullable: false),
                    DistanciaMasCercanaKm = table.Column<double>(type: "double precision", nullable: true),
                    Detalle = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    ConsultadoEn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_verificaciones_satelitales", x => x.Id);
                    table.ForeignKey(
                        name: "FK_verificaciones_satelitales_reportes_ReporteId",
                        column: x => x.ReporteId,
                        principalTable: "reportes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "usuarios",
                columns: new[] { "Id", "CreadoEn", "Email", "Municipio", "Nombre", "PasswordHash", "Rol" },
                values: new object[,]
                {
                    { 1, new DateTime(2026, 8, 15, 0, 0, 0, 0, DateTimeKind.Utc), "ciudadano@conectariesgoai.demo", "Bogotá", "Ana Ciudadana", "$2b$12$08eRl6W5Vpj8HwNAAQ3NUOUQOM.aG/NA.WTBc5LbMWjN9jz.3mwJ.", "Ciudadano" },
                    { 2, new DateTime(2026, 8, 15, 0, 0, 0, 0, DateTimeKind.Utc), "gestor@conectariesgoai.demo", "Bogotá", "Carlos Gestor", "$2b$12$08eRl6W5Vpj8HwNAAQ3NUOUQOM.aG/NA.WTBc5LbMWjN9jz.3mwJ.", "Gestor" },
                    { 3, new DateTime(2026, 8, 15, 0, 0, 0, 0, DateTimeKind.Utc), "admin@conectariesgoai.demo", "Bogotá", "Admin Sistema", "$2b$12$08eRl6W5Vpj8HwNAAQ3NUOUQOM.aG/NA.WTBc5LbMWjN9jz.3mwJ.", "Admin" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_verificaciones_satelitales_ReporteId",
                table: "verificaciones_satelitales",
                column: "ReporteId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "verificaciones_satelitales");

            migrationBuilder.DeleteData(
                table: "usuarios",
                keyColumn: "Id",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "usuarios",
                keyColumn: "Id",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "usuarios",
                keyColumn: "Id",
                keyValue: 3);
        }
    }
}
