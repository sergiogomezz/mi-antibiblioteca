# Contexto del proyecto

Antes de proponer producto o implementar funcionalidades, lee `docs/vision.md`
y la skill del proyecto en `.agents/skills/mi-antibiblioteca/SKILL.md`.
Ese documento conserva la visión, lo confirmado y las preguntas abiertas.

Actualízalo cuando la conversación aporte decisiones o cambios relevantes.
Distingue lo que el usuario ha confirmado de propuestas del agente; una idea
explorada no equivale a una decisión. Sustituye información obsoleta para evitar
versiones contradictorias. Mantén el contexto en español.

El proyecto está en fase de exploración. Una conversación sobre posibilidades
no autoriza a implementarlas todas ni a cerrar arquitectura o diseño visual.

Base técnica existente: Python >=3.12, dependencias con uv, entorno `.venv`.
Usa `uv sync`, `uv run main.py` y `uv add` según corresponda.


## Actualización de las instrucciones

Cuando cambien decisiones, comportamiento, arquitectura o flujos de trabajo,
actualiza la propia skill y el contexto relevante antes de terminar la tarea.
Mantén el README coherente con los comandos y capacidades reales. La copia
versionada de la skill es la fuente; evita instalaciones personales divergentes.
