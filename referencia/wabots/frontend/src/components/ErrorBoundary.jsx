import { Component } from 'react';

// Captura errores de render de cualquier página y muestra una pantalla
// amable en vez de dejar la app en blanco.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  // Actualiza el estado para mostrar la pantalla de error en el siguiente render.
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  // Punto para registrar el error (consola por ahora).
  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary capturó un error:', error, info);
  }

  handleReload = () => {
    // Recarga completa para volver a un estado limpio.
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error } = this.state;
    const detail =
      (error && (error.stack || error.message)) || 'Sin detalle disponible';

    return (
      <div className="flex h-full items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="card space-y-4 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-danger/15 text-2xl">
              ⚠️
            </span>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Algo salió mal</h1>
              <p className="mt-1 text-sm text-slate-500">
                Ocurrió un error inesperado. Puede recargar la página para continuar.
              </p>
            </div>

            <button className="btn-primary w-full" onClick={this.handleReload}>
              Recargar
            </button>

            {/* Detalle del error colapsable */}
            <details className="text-left">
              <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-700">
                Ver detalle del error
              </summary>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-danger-dark">
                {detail}
              </pre>
            </details>
          </div>
        </div>
      </div>
    );
  }
}
