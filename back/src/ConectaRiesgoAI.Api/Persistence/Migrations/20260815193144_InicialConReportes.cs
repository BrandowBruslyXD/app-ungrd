using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ConectaRiesgoAI.Api.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InicialConReportes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "usuarios",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Nombre = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Email = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: false),
                    Rol = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Municipio = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    CreadoEn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_usuarios", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "reportes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Codigo = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Tipo = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Descripcion = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    Latitud = table.Column<double>(type: "double precision", nullable: false),
                    Longitud = table.Column<double>(type: "double precision", nullable: false),
                    Direccion = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    Municipio = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    UrlFoto = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Estado = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Prioridad = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    CreadoEn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ActualizadoEn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UsuarioId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_reportes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_reportes_usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "eventos_cronologia",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ReporteId = table.Column<int>(type: "integer", nullable: false),
                    Estado = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Nota = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Fecha = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Responsable = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_eventos_cronologia", x => x.Id);
                    table.ForeignKey(
                        name: "FK_eventos_cronologia_reportes_ReporteId",
                        column: x => x.ReporteId,
                        principalTable: "reportes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_eventos_cronologia_ReporteId",
                table: "eventos_cronologia",
                column: "ReporteId");

            migrationBuilder.CreateIndex(
                name: "IX_reportes_Codigo",
                table: "reportes",
                column: "Codigo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_reportes_CreadoEn",
                table: "reportes",
                column: "CreadoEn");

            migrationBuilder.CreateIndex(
                name: "IX_reportes_Estado",
                table: "reportes",
                column: "Estado");

            migrationBuilder.CreateIndex(
                name: "IX_reportes_Municipio",
                table: "reportes",
                column: "Municipio");

            migrationBuilder.CreateIndex(
                name: "IX_reportes_UsuarioId",
                table: "reportes",
                column: "UsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_usuarios_Email",
                table: "usuarios",
                column: "Email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "eventos_cronologia");

            migrationBuilder.DropTable(
                name: "reportes");

            migrationBuilder.DropTable(
                name: "usuarios");
        }
    }
}
