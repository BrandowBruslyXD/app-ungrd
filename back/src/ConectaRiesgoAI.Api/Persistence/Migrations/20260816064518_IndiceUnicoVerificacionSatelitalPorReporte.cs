using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ConectaRiesgoAI.Api.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class IndiceUnicoVerificacionSatelitalPorReporte : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_verificaciones_satelitales_ReporteId",
                table: "verificaciones_satelitales");

            migrationBuilder.CreateIndex(
                name: "IX_verificaciones_satelitales_ReporteId",
                table: "verificaciones_satelitales",
                column: "ReporteId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_verificaciones_satelitales_ReporteId",
                table: "verificaciones_satelitales");

            migrationBuilder.CreateIndex(
                name: "IX_verificaciones_satelitales_ReporteId",
                table: "verificaciones_satelitales",
                column: "ReporteId");
        }
    }
}
