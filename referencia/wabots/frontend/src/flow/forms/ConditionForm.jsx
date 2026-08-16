// Formulario del nodo Condición.
import VarField from '../VarField';
import { Field } from './fields.jsx';

// Operadores soportados por el nodo `condition`.
const OPERATORS = [
  { value: '==', label: 'igual a (==)' },
  { value: '!=', label: 'distinto de (!=)' },
  { value: '>', label: 'mayor que (>)' },
  { value: '<', label: 'menor que (<)' },
  { value: 'contains', label: 'contiene' },
  { value: 'empty', label: 'está vacío' },
];

export default function ConditionForm({ data, patch, vars }) {
  const showRight = data.op !== 'empty';
  return (
    <>
      <Field label="Valor izquierdo">
        <VarField
          vars={vars}
          value={data.left || ''}
          placeholder="Elige una variable"
          onChange={(next) => patch({ left: next })}
        />
      </Field>
      <Field label="Operador">
        <select
          className="input"
          value={data.op || '=='}
          onChange={(e) => patch({ op: e.target.value })}
        >
          {OPERATORS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>
      {showRight && (
        <Field label="Valor derecho">
          <VarField
            vars={vars}
            value={data.right || ''}
            onChange={(next) => patch({ right: next })}
          />
        </Field>
      )}
    </>
  );
}
