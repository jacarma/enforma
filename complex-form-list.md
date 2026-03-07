Aquí tienes **10 formularios reales muy complejos** que se usan mucho como referencia para probar motores de formularios. Son buenos porque tienen **muchas dependencias entre campos, secciones dinámicas, cálculos y subformularios repetibles**.

---

# 1. IRS Form 1040

Probablemente el formulario fiscal más famoso.

**Por qué es interesante**

- Muchas secciones opcionales
- Dependencias con otros schedules
- Cálculos entre campos
- Validación cruzada

**Complejidad típica**

```
Si ingresos > X → habilitar Schedule 1
Si inversión → habilitar Schedule B
Si self-employed → Schedule C
Si dependientes → Child Tax Credit
```

Además hay **subformularios (Schedules)** que se activan según respuestas.

---

# 2. Uniform Residential Loan Application

El formulario estándar para pedir una hipoteca en EE. UU.

**Muy bueno para testing porque tiene:**

- múltiples solicitantes
- historial laboral
- activos / pasivos
- propiedades previas
- dependientes

**Complejidades**

- arrays dinámicos
- lógica entre solicitante y co-solicitante
- cálculo de ratios financieros

---

# 3. CMS‑1500

Formulario de **facturación médica a seguros**.

Campos complejos:

- códigos ICD-10
- códigos CPT
- múltiples diagnósticos
- proveedor, facility, referring physician

**Dependencias**

```
Si procedimiento quirúrgico → más campos
Si accidente laboral → employer info
Si accidente de tráfico → insurer details
```

---

# 4. DA Form 31

Sorprendentemente complejo.

Tiene reglas como:

- tipo de permiso
- acumulación de días
- cadena de aprobación

Incluye cálculos automáticos y validaciones de política.

---

# 5. DS‑160

Este es **un monstruo de lógica condicional**.

Dependencias:

- país de origen
- historial de viajes
- empleo
- seguridad

Ejemplo:

```
Si trabajas en gobierno → preguntas adicionales
Si has visitado países específicos → seguridad extra
Si tienes familia en EEUU → nueva sección
```

---

# 6. SF‑86

El formulario para **security clearance**.

Extremadamente largo.

Incluye:

- historial laboral 10 años
- historial de vivienda
- contactos extranjeros
- historial financiero
- viajes internacionales

Tiene **arrays grandes y relaciones temporales entre registros**.

---

# 7. FAFSA

Solicitud de ayuda universitaria.

Complejidades:

- ingresos familiares
- dependientes
- estado civil
- estatus fiscal

Condicionales tipo:

```
Si estudiante dependiente → pedir datos de padres
Si independiente → sección distinta
```

---

# 8. Single Administrative Document

Este es muy cercano a lo que comentabas de **EDI/logística**.

Campos:

- códigos TARIC
- régimen aduanero
- país de origen
- transporte
- valor estadístico

Condicionales fuertes según:

- tipo de mercancía
- régimen de import/export
- transporte

---

# 9. Environmental Impact Assessment Application

Usado en permisos ambientales.

Muy complejo porque depende de:

- tamaño del proyecto
- ubicación
- impacto en fauna
- emisiones

Aparecen secciones completas según respuestas.

---

# 10. UB‑04

Formulario hospitalario para facturación institucional.

Tiene:

- múltiples procedimientos
- múltiples diagnósticos
- episodios de atención
- códigos DRG

Muy similar al CMS-1500 pero más complejo.

---

# Si estás diseñando una librería de formularios en React

Estos formularios suelen requerir estas **capacidades de motor**:

### 1️⃣ dependencias entre campos

```
requiredIf
visibleIf
disabledIf
```

### 2️⃣ cálculos reactivos

```
income_total = salary + dividends
```

### 3️⃣ arrays dinámicos

```
dependents[]
previous_addresses[]
employments[]
```

### 4️⃣ secciones condicionales

```
if employed:
   show employer_section
```

### 5️⃣ validación cruzada

```
start_date < end_date
income_total == sum(incomes)
```

---
