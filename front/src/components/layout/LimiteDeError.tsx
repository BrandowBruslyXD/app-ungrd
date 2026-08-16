import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Red de seguridad para cuando algo revienta al renderizar.
 *
 * Sin esto, cualquier excepción desmonta el árbol entero y deja la página **en
 * blanco absoluto**: ni cabecera, ni mensaje, ni forma de salir. Se descubrió
 * probando con la red caída — las pantallas se cargan con `lazy`, y un trozo de
 * código que no llega a descargarse lanza una excepción de módulo. Con mala
 * señal eso no es un caso raro, es el caso normal.
 *
 * Lo peor de la pantalla en blanco es que no ofrece salida. Alguien reportando
 * una emergencia cierra la aplicación y no vuelve. Aquí al menos hay un mensaje
 * y un botón para reintentar.
 *
 * Es una clase porque React no tiene equivalente con hooks: `componentDidCatch`
 * y `getDerivedStateFromError` solo existen en componentes de clase.
 */
interface Props {
  children: ReactNode;
}

interface Estado {
  fallo: boolean;
}

export default class LimiteDeError extends Component<Props, Estado> {
  state: Estado = { fallo: false };

  static getDerivedStateFromError(): Estado {
    return { fallo: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    /*
     * Solo a la consola, y sin datos del reporte. Esta aplicación maneja
     * documentos de identidad, fotos y ubicaciones: lo que se registra lleva
     * identificadores, nunca contenido (ver CLAUDE.md, Ley 1581).
     */
    console.error('Fallo al renderizar:', error.message, info.componentStack);
  }

  private recargar = (): void => {
    // Recarga completa en vez de limpiar el estado: si lo que falló fue la
    // descarga de un trozo de la aplicación, volver a montar el mismo componente
    // falla otra vez. Pedirlo de nuevo al servidor sí lo arregla.
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.fallo) {
      return this.props.children;
    }

    return (
      <div role="alert" className="mx-auto max-w-lg px-4 py-16 text-center">
        <AlertTriangle className="mx-auto h-14 w-14 text-alerta-500" aria-hidden="true" />
        <h1 className="mt-4 text-xl">No pudimos mostrar esta pantalla</h1>
        <p className="mt-2 leading-relaxed text-tinta-700">
          Puede que la conexión se haya cortado mientras cargaba. Tus reportes siguen guardados.
        </p>
        <button type="button" onClick={this.recargar} className="btn-primary mt-7 inline-flex">
          <RefreshCw className="h-5 w-5" aria-hidden="true" />
          Volver a cargar
        </button>
        <p className="mt-6 text-sm text-tinta-500">
          Si necesitas ayuda urgente, llama al 123. Esta página no reemplaza esa línea.
        </p>
      </div>
    );
  }
}
