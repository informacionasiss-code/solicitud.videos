import { Component, type ErrorInfo, type ReactNode } from "react";

// ============================================================================
// Red de seguridad de la interfaz.
//
// Sin esto, cualquier excepción durante el render deja el <div id="root">
// vacío: la pantalla queda en blanco y no hay forma de saber qué pasó sin
// abrir la consola del navegador. Aquí el fallo se muestra en pantalla, con el
// mensaje y la traza, que es lo único que permite diagnosticar un problema que
// sólo ocurre en producción.
// ============================================================================

interface Props {
    children: ReactNode;
}

interface State {
    error: Error | null;
    info: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    state: State = { error: null, info: null };

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error("[APP] Error no controlado:", error, info);
        this.setState({ info });
    }

    render() {
        const { error, info } = this.state;
        if (!error) return this.props.children;

        const detalle = [
            error.message,
            error.stack || "",
            info?.componentStack ? `\nComponentes:${info.componentStack}` : "",
        ].join("\n");

        return (
            <div className="flex min-h-screen items-start justify-center bg-slate-50 p-4 font-sans text-slate-900">
                <div className="mt-10 w-full max-w-2xl rounded-lg border border-red-200 bg-white p-6 shadow-lg">
                    <h1 className="mb-2 text-xl font-bold text-red-600">La aplicación falló al cargar</h1>
                    <p className="mb-4 text-sm text-slate-600">
                        Ocurrió un error inesperado. El detalle de abajo es lo que hace falta para
                        corregirlo.
                    </p>

                    <p className="rounded bg-red-50 p-3 font-mono text-sm text-red-800">
                        {error.message || "Error sin mensaje"}
                    </p>

                    <details className="mt-4">
                        <summary className="cursor-pointer text-sm font-medium text-slate-700">
                            Ver detalle técnico
                        </summary>
                        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded bg-slate-900 p-3 text-xs text-slate-100">
                            {detalle}
                        </pre>
                    </details>

                    <div className="mt-5 flex flex-wrap gap-2">
                        <button
                            onClick={() => window.location.reload()}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                        >
                            Recargar
                        </button>
                        <button
                            onClick={() => {
                                navigator.clipboard?.writeText(detalle);
                            }}
                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            Copiar detalle
                        </button>
                        <a
                            href="/portal"
                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            Ir al portal
                        </a>
                    </div>
                </div>
            </div>
        );
    }
}
