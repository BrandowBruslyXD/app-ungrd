using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ConectaRiesgoAI.Api.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AgregaCensoBrigadista : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "operaciones_censo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Codigo = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Municipio = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    BarrioVereda = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    BrigadistaId = table.Column<int>(type: "integer", nullable: false),
                    AbiertaEn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CerradaEn = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_operaciones_censo", x => x.Id);
                    table.ForeignKey(
                        name: "FK_operaciones_censo_usuarios_BrigadistaId",
                        column: x => x.BrigadistaId,
                        principalTable: "usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "personas_afectadas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Codigo = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    ReporteId = table.Column<int>(type: "integer", nullable: true),
                    OperacionCensoId = table.Column<int>(type: "integer", nullable: false),
                    RegistradoPorId = table.Column<int>(type: "integer", nullable: false),
                    Nombres = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Apellidos = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    TipoDocumento = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    NumeroDocumento = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    Edad = table.Column<int>(type: "integer", nullable: false),
                    Genero = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Telefono = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    TelefonoAlterno = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Email = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    Departamento = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Ciudad = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Comuna = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    DireccionResidencia = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Latitud = table.Column<double>(type: "double precision", nullable: true),
                    Longitud = table.Column<double>(type: "double precision", nullable: true),
                    EsResidenteDelMunicipio = table.Column<bool>(type: "boolean", nullable: false),
                    EsCabezaDeHogar = table.Column<bool>(type: "boolean", nullable: false),
                    TieneDiscapacidad = table.Column<bool>(type: "boolean", nullable: false),
                    EsAdultoMayor = table.Column<bool>(type: "boolean", nullable: false),
                    EstaEmbarazada = table.Column<bool>(type: "boolean", nullable: false),
                    PerteneceGrupoEtnico = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    EsVictimaConflicto = table.Column<bool>(type: "boolean", nullable: false),
                    RequiereAtencionMedica = table.Column<bool>(type: "boolean", nullable: false),
                    ObservacionesSalud = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    DeclaracionVeracidad = table.Column<bool>(type: "boolean", nullable: false),
                    FechaDeclaracion = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ConsentimientoDatos = table.Column<bool>(type: "boolean", nullable: false),
                    Estado = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreadoEn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SincronizadoEn = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_personas_afectadas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_personas_afectadas_operaciones_censo_OperacionCensoId",
                        column: x => x.OperacionCensoId,
                        principalTable: "operaciones_censo",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_personas_afectadas_reportes_ReporteId",
                        column: x => x.ReporteId,
                        principalTable: "reportes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_personas_afectadas_usuarios_RegistradoPorId",
                        column: x => x.RegistradoPorId,
                        principalTable: "usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "danos_registrados",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PersonaAfectadaId = table.Column<int>(type: "integer", nullable: false),
                    Categoria = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Nivel = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    TipoInmueble = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    EsPropietario = table.Column<bool>(type: "boolean", nullable: true),
                    Descripcion = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    ValorEstimado = table.Column<decimal>(type: "numeric(14,2)", precision: 14, scale: 2, nullable: true),
                    HectareasAfectadas = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    AnimalesPerdidos = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_danos_registrados", x => x.Id);
                    table.ForeignKey(
                        name: "FK_danos_registrados_personas_afectadas_PersonaAfectadaId",
                        column: x => x.PersonaAfectadaId,
                        principalTable: "personas_afectadas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "miembros_nucleo_familiar",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PersonaAfectadaId = table.Column<int>(type: "integer", nullable: false),
                    Nombres = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Apellidos = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Parentesco = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Edad = table.Column<int>(type: "integer", nullable: false),
                    TipoDocumento = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    NumeroDocumento = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    TieneDiscapacidad = table.Column<bool>(type: "boolean", nullable: false),
                    EstudiaActualmente = table.Column<bool>(type: "boolean", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_miembros_nucleo_familiar", x => x.Id);
                    table.ForeignKey(
                        name: "FK_miembros_nucleo_familiar_personas_afectadas_PersonaAfectada~",
                        column: x => x.PersonaAfectadaId,
                        principalTable: "personas_afectadas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_danos_registrados_PersonaAfectadaId",
                table: "danos_registrados",
                column: "PersonaAfectadaId");

            migrationBuilder.CreateIndex(
                name: "IX_miembros_nucleo_familiar_PersonaAfectadaId",
                table: "miembros_nucleo_familiar",
                column: "PersonaAfectadaId");

            migrationBuilder.CreateIndex(
                name: "IX_operaciones_censo_BrigadistaId_Municipio_Abierta",
                table: "operaciones_censo",
                columns: new[] { "BrigadistaId", "Municipio" },
                unique: true,
                filter: "\"CerradaEn\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_operaciones_censo_Codigo",
                table: "operaciones_censo",
                column: "Codigo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_personas_afectadas_Codigo",
                table: "personas_afectadas",
                column: "Codigo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_personas_afectadas_Estado",
                table: "personas_afectadas",
                column: "Estado");

            migrationBuilder.CreateIndex(
                name: "IX_personas_afectadas_OperacionCensoId_NumeroDocumento",
                table: "personas_afectadas",
                columns: new[] { "OperacionCensoId", "NumeroDocumento" },
                unique: true,
                filter: "\"NumeroDocumento\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_personas_afectadas_RegistradoPorId",
                table: "personas_afectadas",
                column: "RegistradoPorId");

            migrationBuilder.CreateIndex(
                name: "IX_personas_afectadas_ReporteId",
                table: "personas_afectadas",
                column: "ReporteId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "danos_registrados");

            migrationBuilder.DropTable(
                name: "miembros_nucleo_familiar");

            migrationBuilder.DropTable(
                name: "personas_afectadas");

            migrationBuilder.DropTable(
                name: "operaciones_censo");
        }
    }
}
