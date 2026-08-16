using ConectaRiesgoAI.Api.Domain.Enums;
using ConectaRiesgoAI.Api.Features.Ingesta.RegistrarCenso;

namespace ConectaRiesgoAI.Api.Tests.Features.Ingesta.RegistrarCenso;

public class RegistrarCensoValidatorTests
{
    private static readonly RegistrarCensoValidator Validador = new();

    private static RegistrarCensoCommand Comando(bool consentimiento = true, bool declaracionVeracidad = true, string telefono = "573001234567") =>
        new(
            Telefono: telefono,
            Municipio: "Soacha",
            BarrioVereda: "Villa Mercedes",
            Consentimiento: consentimiento,
            DeclaracionVeracidad: declaracionVeracidad,
            Nombres: "María",
            Apellidos: "Ramírez",
            TipoDocumento: TipoDocumentoPersona.CC,
            NumeroDocumento: "1234567890",
            Edad: 34,
            Genero: GeneroPersona.Femenino,
            TelefonoContacto: null,
            Departamento: "Cundinamarca",
            Ciudad: "Soacha",
            DireccionResidencia: "Villa Mercedes, casa 12",
            Latitud: null,
            Longitud: null,
            EsCabezaDeHogar: true,
            TieneDiscapacidad: false,
            EsAdultoMayor: false,
            EstaEmbarazada: false,
            PerteneceGrupoEtnico: null,
            EsVictimaConflicto: false,
            RequiereAtencionMedica: false,
            EstadoVivienda: "Averiada — NO habitable",
            Necesidad: "AHE alimentaria",
            MiembrosNucleo: null);

    [Fact]
    public void Validate_ComandoValido_Pasa()
    {
        var resultado = Validador.Validate(Comando());

        Assert.True(resultado.IsValid);
    }

    [Fact]
    public void Validate_ConsentimientoFalse_Falla()
    {
        var resultado = Validador.Validate(Comando(consentimiento: false));

        Assert.False(resultado.IsValid);
        var error = Assert.Single(resultado.Errors, e => e.PropertyName == nameof(RegistrarCensoCommand.Consentimiento));
        Assert.Equal("Sin consentimiento del titular no se puede registrar el censo", error.ErrorMessage);
    }

    [Fact]
    public void Validate_DeclaracionVeracidadFalse_Falla()
    {
        var resultado = Validador.Validate(Comando(declaracionVeracidad: false));

        Assert.False(resultado.IsValid);
        Assert.Contains(resultado.Errors, e => e.PropertyName == nameof(RegistrarCensoCommand.DeclaracionVeracidad));
    }

    [Fact]
    public void Validate_TelefonoVacio_Falla()
    {
        var resultado = Validador.Validate(Comando(telefono: ""));

        Assert.False(resultado.IsValid);
        Assert.Contains(resultado.Errors, e => e.PropertyName == nameof(RegistrarCensoCommand.Telefono));
    }

    [Fact]
    public void Validate_NombresVacios_Falla()
    {
        var comando = Comando() with { Nombres = "" };

        var resultado = Validador.Validate(comando);

        Assert.False(resultado.IsValid);
        Assert.Contains(resultado.Errors, e => e.PropertyName == nameof(RegistrarCensoCommand.Nombres));
    }

    [Fact]
    public void Validate_EdadFueraDeRango_Falla()
    {
        var comando = Comando() with { Edad = 200 };

        var resultado = Validador.Validate(comando);

        Assert.False(resultado.IsValid);
        Assert.Contains(resultado.Errors, e => e.PropertyName == nameof(RegistrarCensoCommand.Edad));
    }

    [Fact]
    public void Validate_MiembroDeNucleoConNombreVacio_Falla()
    {
        var comando = Comando() with
        {
            MiembrosNucleo = [new MiembroNucleoFamiliarInput("", "Ramírez", ParentescoFamiliar.Hijo, 8, null, null, false, true)]
        };

        var resultado = Validador.Validate(comando);

        Assert.False(resultado.IsValid);
    }

    [Fact]
    public void Validate_MasDeVeinteMiembrosDeNucleo_Falla()
    {
        var miembros = Enumerable.Range(0, 21)
            .Select(i => new MiembroNucleoFamiliarInput($"Nombre{i}", "Apellido", ParentescoFamiliar.Hijo, 5, null, null, false, null))
            .ToList();
        var comando = Comando() with { MiembrosNucleo = miembros };

        var resultado = Validador.Validate(comando);

        Assert.False(resultado.IsValid);
        Assert.Contains(resultado.Errors, e => e.PropertyName == nameof(RegistrarCensoCommand.MiembrosNucleo));
    }

    [Fact]
    public void Validate_MiembroDeNucleoConTipoDocumentoFueraDeRango_Falla()
    {
        var comando = Comando() with
        {
            MiembrosNucleo = [new MiembroNucleoFamiliarInput("Juan", "Ramírez", ParentescoFamiliar.Hijo, 8, (TipoDocumentoPersona)999, null, false, true)]
        };

        var resultado = Validador.Validate(comando);

        Assert.False(resultado.IsValid);
    }

    [Fact]
    public void Validate_LatitudFueraDeRango_Falla()
    {
        var comando = Comando() with { Latitud = 999 };

        var resultado = Validador.Validate(comando);

        Assert.False(resultado.IsValid);
        Assert.Contains(resultado.Errors, e => e.PropertyName == nameof(RegistrarCensoCommand.Latitud));
    }

    [Fact]
    public void Validate_LongitudFueraDeRango_Falla()
    {
        var comando = Comando() with { Longitud = -500 };

        var resultado = Validador.Validate(comando);

        Assert.False(resultado.IsValid);
        Assert.Contains(resultado.Errors, e => e.PropertyName == nameof(RegistrarCensoCommand.Longitud));
    }

    [Fact]
    public void Validate_SinNumeroDocumento_Pasa()
    {
        var comando = Comando() with { TipoDocumento = TipoDocumentoPersona.SinDocumento, NumeroDocumento = null };

        var resultado = Validador.Validate(comando);

        Assert.True(resultado.IsValid);
    }
}
