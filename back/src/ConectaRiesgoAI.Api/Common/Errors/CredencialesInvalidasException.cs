namespace ConectaRiesgoAI.Api.Common.Errors;

/// <summary>Correo o contraseña incorrectos al iniciar sesión. Se traduce a 401, no a 400: el dato en sí es válido.</summary>
public class CredencialesInvalidasException(string mensaje) : Exception(mensaje);
