// Tutoriales paso a paso para vincular los canales de WhatsApp (Twilio y Meta).

// Bloque de código copiable, con resize: hace wrap y scroll horizontal si es largo.
export function Code({ children }) {
  return (
    <code className="mt-1 block w-full overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[12px] text-slate-700">
      {children}
    </code>
  );
}

export function Step({ n, children }) {
  return (
    <li className="flex gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-bold text-brand-dark">{n}</span>
      <div className="min-w-0 flex-1 text-sm leading-relaxed text-slate-600">{children}</div>
    </li>
  );
}

export function TwilioGuide({ origin }) {
  return (
    <ol className="space-y-3">
      <Step n="1">Ingrese a <b>console.twilio.com</b> con su cuenta de Twilio.</Step>
      <Step n="2">En el <b>Dashboard</b> copie el <b>Account SID</b> (empieza por <code className="font-mono">AC…</code>).</Step>
      <Step n="3">Cree una API Key: <b>Account → API keys &amp; tokens → Create API key</b> (tipo <i>Standard</i>). Copie el <b>API Key SID</b> (<code className="font-mono">SK…</code>) y el <b>Secret</b> (¡solo se muestra una vez!).</Step>
      <Step n="4">Copie el <b>Auth Token</b> desde <b>Account Info</b> (sirve para validar los webhooks; con él activado es más seguro).</Step>
      <Step n="5"><b>Número remitente</b>:
        <ul className="ml-4 mt-1 list-disc space-y-1">
          <li><b>Pruebas</b>: active el <i>WhatsApp Sandbox</i> (Messaging → Try it out). El número es <Code>whatsapp:+14155238886</Code> y su celular debe unirse enviando <code className="font-mono">join &lt;palabra&gt;</code>.</li>
          <li><b>Producción</b>: un número con WhatsApp habilitado → formato <Code>whatsapp:+57XXXXXXXXXX</Code></li>
        </ul>
      </Step>
      <Step n="6">Pegue todo en este formulario y pulse <b>Vincular Twilio</b>.</Step>
      <Step n="7">En Twilio, en <b>"When a message comes in"</b> (Sandbox o su número), coloque la URL (método <b>POST</b>):
        <Code>{origin}/api/webhooks/twilio</Code>
      </Step>
      <Step n="8">Escriba a su número de WhatsApp de Twilio → el bot debe responder con el flujo activo.</Step>
    </ol>
  );
}

export function MetaGuide({ origin }) {
  return (
    <ol className="space-y-3">
      <Step n="1">Ingrese a <b>developers.facebook.com</b> → <b>My Apps → Create App</b> → tipo <b>Business</b>.</Step>
      <Step n="2">En la app, agregue el producto <b>WhatsApp</b> (menú lateral → “Add product”).</Step>
      <Step n="3">En <b>WhatsApp → API Setup</b> copie el <b>Phone Number ID</b> (es el ID del número, NO el número).</Step>
      <Step n="4"><b>Access Token permanente</b>: en <b>Business Settings → Users → System users</b> cree un usuario de sistema, asígnele la WABA con permisos <code className="font-mono">whatsapp_business_messaging</code> y <code className="font-mono">whatsapp_business_management</code>, y genere un token <b>sin expiración</b>. Ese es el <b>Access Token (WABA)</b>.</Step>
      <Step n="5"><b>App Secret</b>: en <b>App → Settings → Basic → App Secret</b> (sirve para validar la firma del webhook).</Step>
      <Step n="6"><b>Verify Token</b>: invente una cadena cualquiera (ej. una aleatoria). Debe ser <b>la misma</b> aquí y en la config del webhook de Meta.</Step>
      <Step n="7">Pegue Phone Number ID, Access Token, App Secret y Verify Token en este formulario → <b>Vincular Meta</b>.</Step>
      <Step n="8">En <b>WhatsApp → Configuration → Webhook</b>: coloque la <b>Callback URL</b>:
        <Code>{origin}/api/webhooks/meta</Code>
        el <b>Verify Token</b> igual al del paso 6, y <b>Verify and save</b>. Luego <b>suscríbase</b> al campo <code className="font-mono">messages</code>.
      </Step>
      <Step n="9">Agregue/valide el número de destino de prueba en <b>API Setup</b> y envíe un mensaje: el bot debe responder.</Step>
    </ol>
  );
}
