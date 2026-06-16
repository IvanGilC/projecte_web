# P1 + P2 – REST API + Frontend: Tournament App

## Participantes

- Marco Beruet Morelli
- Ivan Gil Cañizares

---

## Endpoints de la API

### Autenticación

#### `POST /api/login`
- **Descripción**: Autentica a un usuario y devuelve un token JWT.
- **Autenticación**: No requerida
- **Body**: `{ username, password }`
- **Respuesta**: `{ token, id, username, role }`

---

### Usuarios

#### `GET /api/users`
- **Descripción**: Devuelve la lista de todos los usuarios.
- **Autenticación**: Requerida
- **Roles**: `admin`
- **Respuesta**: Array de usuarios (sin `password_hash`)

#### `GET /api/users/:username`
- **Descripción**: Devuelve el perfil público de un usuario, incluyendo su historial de partidas.
- **Autenticación**: No requerida
- **Respuesta**: `{ id, username, email, role, matches[] }`

#### `POST /api/users`
- **Descripción**: Registra un nuevo usuario. Por defecto se asigna el rol `player`. Solo los administradores pueden asignar los roles `organizer` o `admin`.
- **Autenticación**: No requerida (para jugadores). Requerida para otros roles.
- **Roles**: `admin` (para asignar roles no-player)
- **Body**: `{ username, email, password, role? }`
- **Respuesta**: Usuario creado (sin `password_hash`)

#### `PUT /api/users/:id`
- **Descripción**: Actualiza el email o la contraseña de un usuario. Un usuario solo puede editar su propio perfil, excepto los administradores que pueden editar cualquier usuario.
- **Autenticación**: Requerida
- **Roles**: Cualquiera (perfil propio) o `admin`
- **Body**: `{ email?, password? }`
- **Respuesta**: Usuario actualizado (sin `password_hash`)

#### `DELETE /api/users/:id`
- **Descripción**: Elimina un usuario.
- **Autenticación**: Requerida
- **Roles**: `admin`
- **Respuesta**: `204 No Content`

#### `GET /api/users/:id/registrations` *(añadido en P2)*
- **Descripción**: Devuelve los torneos en los que está inscrito el usuario, junto con el estado de su inscripción (`pending`, `approved` o `rejected`).
- **Autenticación**: Requerida
- **Roles**: El propio usuario o `admin`
- **Respuesta**: Array de objetos con `{ id, name, status, type, start_date, videogame_id, registration_status }`

#### `GET /api/users/:id/tournaments` *(añadido en P2)*
- **Descripción**: Devuelve los torneos de los que el usuario es propietario (`owner_id`).
- **Autenticación**: Requerida
- **Roles**: `organizer` o `admin` (solo el propio usuario o un administrador)
- **Respuesta**: Array de torneos ordenados por fecha de inicio descendente

---

### Videojuegos

#### `GET /api/videogames`
- **Descripción**: Devuelve la lista de todos los videojuegos.
- **Autenticación**: No requerida
- **Respuesta**: Array de videojuegos

#### `GET /api/videogames/:id`
- **Descripción**: Devuelve la información de un videojuego concreto.
- **Autenticación**: No requerida
- **Respuesta**: `{ id, name, description }`

#### `POST /api/videogames`
- **Descripción**: Crea un nuevo videojuego.
- **Autenticación**: Requerida
- **Roles**: `admin`
- **Body**: `{ name, description? }`
- **Respuesta**: Videojuego creado

#### `PUT /api/videogames/:id`
- **Descripción**: Actualiza un videojuego.
- **Autenticación**: Requerida
- **Roles**: `admin`
- **Body**: `{ name?, description? }`
- **Respuesta**: Videojuego actualizado

#### `DELETE /api/videogames/:id`
- **Descripción**: Elimina un videojuego. No está permitido si el videojuego tiene torneos activos (`planned` u `ongoing`).
- **Autenticación**: Requerida
- **Roles**: `admin`
- **Respuesta**: `204 No Content`

---

### Torneos

#### `GET /api/tournaments`
- **Descripción**: Devuelve la lista de todos los torneos.
- **Autenticación**: No requerida
- **Respuesta**: Array de torneos

#### `GET /api/tournaments/:id`
- **Descripción**: Devuelve la información completa de un torneo, incluyendo jugadores, organizadores, partidas y clasificación (si está finalizado).
- **Autenticación**: No requerida
- **Respuesta**: `{ ...tournament, players[], organizers[], matches[], standings[] | null }`

#### `POST /api/tournaments`
- **Descripción**: Crea un nuevo torneo. El creador se convierte automáticamente en el propietario. Las partidas se crean automáticamente según el tipo y el número máximo de jugadores.
- **Autenticación**: Requerida
- **Roles**: `organizer`
- **Body**: `{ name, videogame_id, type, start_date, max_players, description?, end_date? }`
- **Respuesta**: Torneo creado

#### `PUT /api/tournaments/:id`
- **Descripción**: Actualiza los datos del torneo. Solo el propietario puede editarlo.
- **Autenticación**: Requerida
- **Roles**: `organizer`, `admin`
- **Body**: `{ name?, description?, start_date?, end_date?, status?, registrations_open? }`
- **Respuesta**: Torneo actualizado

#### `DELETE /api/tournaments/:id`
- **Descripción**: Elimina un torneo y todos sus datos asociados (partidas, inscripciones). Solo el propietario o un administrador pueden eliminarlo.
- **Autenticación**: Requerida
- **Roles**: `organizer`, `admin`
- **Respuesta**: `204 No Content`

#### `POST /api/tournaments/:id/start`
- **Descripción**: Inicia el torneo, cambiando el estado a `ongoing`. Asigna automáticamente todos los jugadores aprobados a sus partidas según el tipo de torneo. En eliminatoria: los jugadores se asignan a los matches de la Ronda 1. En liga: se generan todos los emparejamientos posibles.
- **Autenticación**: Requerida
- **Roles**: `organizer`, `admin`
- **Respuesta**: Torneo actualizado

#### `POST /api/tournaments/:id/finish`
- **Descripción**: Finaliza el torneo y calcula la clasificación final según el número de victorias. Todas las partidas deben estar completadas.
- **Autenticación**: Requerida
- **Roles**: `organizer`, `admin`
- **Respuesta**: `{ message, standings[] }`

#### `POST /api/tournaments/:id/register`
- **Descripción**: Inscribe al jugador autenticado en un torneo. Solo está permitido si las inscripciones están abiertas y el torneo está en estado `planned`.
- **Autenticación**: Requerida
- **Roles**: `player`
- **Respuesta**: `{ message }`

#### `PUT /api/tournaments/:id/registrations`
- **Descripción**: Abre o cierra las inscripciones del torneo. Solo el propietario puede cambiarlo.
- **Autenticación**: Requerida
- **Roles**: `organizer`, `admin`
- **Body**: `{ registrations_open: boolean }`
- **Respuesta**: Torneo actualizado

#### `PUT /api/tournaments/:id/players/:userId`
- **Descripción**: Aprueba o rechaza la inscripción de un jugador. Un jugador no puede ser aprobado más de una vez en el mismo torneo.
- **Autenticación**: Requerida
- **Roles**: `organizer`, `admin`
- **Body**: `{ status: 'approved' | 'rejected' }`
- **Respuesta**: `{ message }`

#### `POST /api/tournaments/:id/organizers`
- **Descripción**: Añade un organizador de soporte al torneo. Solo el propietario puede hacerlo.
- **Autenticación**: Requerida
- **Roles**: `organizer`, `admin`
- **Body**: `{ user_id }`
- **Respuesta**: `{ message }`

#### `DELETE /api/tournaments/:id/organizers/:userId`
- **Descripción**: Elimina un organizador de soporte del torneo. Solo el propietario puede hacerlo.
- **Autenticación**: Requerida
- **Roles**: `organizer`, `admin`
- **Respuesta**: `204 No Content`

---

### Partidas

#### `GET /api/matches/:id`
- **Descripción**: Devuelve la información de una partida concreta.
- **Autenticación**: No requerida
- **Respuesta**: `{ id, tournament_id, player1_id, player2_id, winner_id, status, round, score_player1, score_player2 }`

#### `PUT /api/matches/:id`
- **Descripción**: Actualiza una partida. El organizador puede asignar el ganador (lo que automáticamente pone el estado a `completed`) y actualizar las puntuaciones. Una partida completada no puede modificarse.
- **Autenticación**: Requerida
- **Roles**: `organizer`, `admin`
- **Body**: `{ winner_id?, score_player1?, score_player2? }`
- **Respuesta**: Partida actualizada

---

## Modelo de datos

### Users (Usuarios)
| Campo | Tipo | Restricciones |
|-------|------|---------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| username | TEXT | UNIQUE NOT NULL |
| email | TEXT | UNIQUE NOT NULL |
| password_hash | TEXT | NOT NULL |
| role | TEXT | CHECK: `player`, `admin`, `organizer` |

### Videogames (Videojuegos)
| Campo | Tipo | Restricciones |
|-------|------|---------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| name | TEXT | UNIQUE NOT NULL |
| description | TEXT | nullable |

### Tournaments (Torneos)
| Campo | Tipo | Restricciones |
|-------|------|---------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| name | TEXT | NOT NULL |
| description | TEXT | nullable |
| videogame_id | INTEGER | FK → videogames(id) ON DELETE CASCADE |
| owner_id | INTEGER | FK → users(id) |
| type | TEXT | CHECK: `elimination`, `league` |
| status | TEXT | CHECK: `planned`, `ongoing`, `finished` |
| start_date | TEXT | NOT NULL |
| end_date | TEXT | nullable |
| max_players | INTEGER | NOT NULL |
| registrations_open | INTEGER | DEFAULT 1 |

### Tournament Organizers (Organizadores de soporte)
| Campo | Tipo | Restricciones |
|-------|------|---------------|
| tournament_id | INTEGER | FK → tournaments(id) ON DELETE CASCADE |
| user_id | INTEGER | FK → users(id) |
| | | PRIMARY KEY(tournament_id, user_id) |

### Tournament Players (Inscripciones)
| Campo | Tipo | Restricciones |
|-------|------|---------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| tournament_id | INTEGER | FK → tournaments(id) ON DELETE CASCADE |
| user_id | INTEGER | FK → users(id) |
| status | TEXT | CHECK: `pending`, `approved`, `rejected` |
| | | UNIQUE(tournament_id, user_id) |

### Matches (Partidas)
| Campo | Tipo | Restricciones |
|-------|------|---------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| tournament_id | INTEGER | FK → tournaments(id) ON DELETE CASCADE |
| player1_id | INTEGER | FK → users(id), nullable |
| player2_id | INTEGER | FK → users(id), nullable |
| winner_id | INTEGER | FK → users(id), nullable |
| status | TEXT | CHECK: `pending`, `assigned`, `completed` |
| round | TEXT | nullable |
| score_player1 | INTEGER | nullable |
| score_player2 | INTEGER | nullable |

### Final Standings (Clasificación final)
| Campo | Tipo | Restricciones |
|-------|------|---------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| tournament_id | INTEGER | FK → tournaments(id) ON DELETE CASCADE |
| user_id | INTEGER | FK → users(id) |
| position | INTEGER | NOT NULL |
| points | INTEGER | DEFAULT 0 |

---

## Decisiones de diseño

### Base de datos

- **`start_date` obligatoria**: Un torneo sin fecha de inicio no tiene sentido práctico. `end_date` es opcional porque a veces no se conoce la fecha exacta de finalización de antemano.
- **`max_players` obligatorio**: Necesario para calcular el número de partidas en el momento de creación del torneo.
- **`ON DELETE CASCADE`**: Eliminar un videojuego elimina en cascada sus torneos. Eliminar un torneo elimina en cascada sus partidas, inscripciones, organizadores de soporte y clasificación final.

### Videojuegos

- **Nombre único**: No pueden existir dos videojuegos con el mismo nombre.
- **No se puede eliminar con torneos activos**: Un videojuego con torneos en estado `planned` u `ongoing` no puede eliminarse. Solo se puede borrar cuando todos sus torneos están `finished`.

### Torneos

- **Las partidas se crean automáticamente al crear el torneo**: Según el tipo y el `max_players`, se genera el número correcto de partidas vacías. En eliminatoria: `max_players - 1` partidas distribuidas en rondas. En liga: `max_players * (max_players - 1) / 2` partidas.
- **La asignación de jugadores ocurre en `/start`**: En lugar de asignar jugadores progresivamente al aprobarlos, todos los jugadores aprobados se asignan a sus partidas de golpe cuando el organizador llama a `/start`. Esto evita estados inconsistentes y da al organizador control total sobre cuándo empieza el torneo.
- **El estado `completed` se asigna automáticamente**: Cuando se proporciona un `winner_id` en la actualización de una partida, el estado se pone automáticamente a `completed`. El cliente no necesita enviarlo explícitamente.
- **El ganador avanza automáticamente en eliminatoria**: Al asignar un ganador, el sistema lo asigna automáticamente al siguiente match disponible de la ronda siguiente.
- **No se puede finalizar con partidas pendientes**: Todas las partidas deben estar en estado `completed` antes de llamar a `/finish`.
- **La clasificación solo incluye jugadores con al menos 1 victoria**: Los jugadores con 0 victorias no aparecen en la clasificación final al no tener puntos que ordenar.

### Seguridad y privacidad

- **`password_hash` nunca se expone**: Ninguna respuesta de la API incluye el hash de la contraseña.
- **Los tokens JWT caducan en 24 horas**: Limita la ventana de exposición en caso de que un token sea comprometido.
- **`database.db` y `.env` están en `.gitignore`**: Los datos sensibles nunca se suben al repositorio.
- **Usuario administrador por defecto**: Se crea un admin por defecto al arrancar la aplicación si no existe ninguno. Las credenciales se configuran mediante variables de entorno.

### Roles

- **Un usuario tiene exactamente un rol**: Un usuario es `player`, `organizer` o `admin`. Esto implica que un organizador no puede inscribirse como jugador en un torneo, ya que el registro requiere el rol `player`. Es una simplificación deliberada del sistema.
- **Organizadores de soporte**: El propietario del torneo puede añadir otros organizadores como soporte. Estos pueden gestionar las partidas del torneo pero no pueden editar los datos del torneo en sí.
- **El admin puede hacer cualquier cosa**: Los administradores pueden realizar cualquier acción independientemente de la propiedad del torneo, incluyendo editar, eliminar, iniciar y finalizar cualquier torneo.

### Partidas

- **Las partidas no se pueden crear ni eliminar desde la API**: Se gestionan automáticamente al crear o eliminar torneos.
- **Una partida completada es inmutable**: Una vez que una partida tiene ganador, no puede modificarse.
- **Un jugador no puede ser aprobado más de una vez**: El sistema comprueba el estado actual de la inscripción directamente en la base de datos antes de aprobar, evitando asignaciones duplicadas en partidas.

### Nuevos endpoints añadidos en la Práctica 2

El desarrollo del frontend requirió añadir dos endpoints nuevos al backend que no estaban contemplados en la Práctica 1:

- **`GET /api/users/:id/registrations`**: Necesario para implementar la página "Mis Inscripciones" del rol jugador. El frontend necesitaba obtener de forma directa todos los torneos en los que un jugador está inscrito junto con el estado de cada inscripción, sin tener que iterar sobre todos los torneos del sistema.

- **`GET /api/users/:id/tournaments`**: Necesario para implementar la página "Mis Torneos" del rol organizador. El frontend necesitaba obtener únicamente los torneos de los que un organizador es propietario, para ofrecerle un acceso rápido a su gestión sin mostrar torneos ajenos.

Ambos endpoints siguen los mismos criterios de seguridad del resto de la API: solo el propio usuario o un administrador puede acceder a los datos de otro usuario.

---

## Páginas del Frontend y funcionalidad

### `/` — HomePage
Página de inicio, accesible públicamente. Muestra un resumen con estadísticas generales (número total de torneos, torneos en curso, próximos torneos, videojuegos disponibles) y listados rápidos de los torneos en curso y próximos, con enlaces directos a su página de detalle.

### `/login` — LoginPage
Formulario de inicio de sesión. Al autenticarse correctamente, guarda el token JWT y los datos del usuario (`token`, `id`, `username`, `role`) en `localStorage` y en el contexto de autenticación, redirigiendo a la home.

### `/register` — RegisterPage
Formulario de registro público. Crea un usuario con rol `player` por defecto y, tras el registro, inicia sesión automáticamente.

### `/videogames` — VideogamesPage
Lista pública de todos los videojuegos, con filtro textual por nombre. Los usuarios con rol `admin` pueden crear, editar y eliminar videojuegos desde esta misma vista mediante un modal.

### `/tournaments` — TournamentsPage
Lista pública de todos los torneos, con filtros por nombre, videojuego y estado (`planned`, `ongoing`, `finished`). Cada torneo muestra el videojuego asociado, estado, fechas, número máximo de jugadores y si las inscripciones están abiertas. Desde cada elemento se puede navegar al detalle del torneo.

### `/tournaments/:id` — TournamentDetailPage
Página de detalle público de un torneo. Incluye datos generales, lista de organizadores y jugadores inscritos (con su estado de inscripción), y las partidas del torneo en tres vistas posibles: tabla general, árbol de eliminatoria (`EliminationBracket`) para torneos de tipo `elimination`, y tabla de clasificación de liga (`LeagueTable`) para torneos de tipo `league`. Si el torneo está finalizado, muestra la clasificación final. Si el usuario autenticado tiene rol `player`, las inscripciones están abiertas y el torneo está en estado `planned`, se muestra un botón para inscribirse; si ya está inscrito, se indica visualmente. Si el usuario es `organizer` o `admin`, se muestra un enlace a la página de gestión del torneo.

### `/tournaments/new` — TournamentCreatePage
Formulario de creación de torneos, accesible solo para `organizer`. Permite especificar nombre, descripción, videojuego, tipo (`elimination` o `league`), fecha de inicio, fecha de fin (opcional) y número máximo de jugadores. Al crearlo, redirige a la página de detalle del nuevo torneo.

### `/tournaments/:id/manage` — TournamentManagePage
Página de gestión de un torneo, accesible para el propietario, organizadores de soporte y `admin`. La interfaz se adapta según el rol del usuario respecto al torneo:
- **Todos los gestores** (propietario, organizadores de soporte, admin): pueden ver y aprobar/rechazar inscripciones de jugadores, y ver/editar las partidas (introducir resultados y asignar ganador) mientras no estén completadas.
- **Solo el propietario** (o admin): puede editar los datos básicos del torneo, abrir/cerrar inscripciones, iniciar el torneo (`/start`), finalizarlo (`/finish`), eliminarlo, y añadir o eliminar organizadores de soporte (buscándolos por nombre de usuario).

Los controles que el usuario actual no tiene permiso de usar se ocultan o se sustituyen por un mensaje informativo.

### `/my-registrations` — MyRegistrationsPage
Accesible solo para usuarios con rol `player`. Muestra los torneos en los que el jugador está inscrito junto con el estado de cada inscripción (`pending`, `approved`, `rejected`) y el estado del torneo.

### `/my-tournaments` — MyTournamentsPage
Accesible solo para usuarios con rol `organizer`. Muestra los torneos de los que el usuario es propietario, con acceso directo a su vista de detalle y de gestión.

### `/profile/:username` — ProfilePage
Perfil público de un usuario, accesible para cualquier visitante autenticado. Muestra información pública (username, rol, email) y el historial de partidas jugadas, con resultado (victoria/derrota), marcador y estado de cada partida. Si el usuario autenticado visita su propio perfil (o es `admin`), dispone de un formulario para editar su email y/o contraseña.

### `/users` — UsersPage
Accesible solo para `admin`. Lista completa de usuarios del sistema, con filtros por nombre de usuario y rol, y acciones para ver el perfil o eliminar un usuario.

### `/users/new` — UserCreatePage
Accesible solo para `admin`. Formulario para crear manualmente un nuevo usuario, con selección de rol (`player`, `organizer`, `admin`).

### `*` — NotFoundPage
Página de error 404 para cualquier ruta no reconocida.

### Componentes auxiliares
- **`Navbar`**: barra de navegación adaptativa según el estado de autenticación y rol del usuario (enlaces públicos, Login/Register, Profile, "My Registrations" para players, "New Tournament"/"My Tournaments" para organizers, "Users"/"New User" para admin, y Logout).
- **`ProtectedRoute`**: envuelve rutas que requieren autenticación y/o un rol concreto. Si el usuario no está autenticado, redirige a `/login`. Si su rol no está permitido, muestra una página de "403 - No autorizado".

---

## Instrucciones de ejecución

### Backend

1. Crear un archivo `.env` en la raíz del proyecto con:
   ```
   SQLITE_URL=database.db
   PORT=3001
   SECRET=lol
   ADMIN_PASSWORD=admin1234
   ```
2. Instalar dependencias: `npm install`
3. Arrancar en modo desarrollo: `npm run dev`
4. El backend corre en `http://localhost:3001`

### Frontend

1. Entrar en la carpeta `frontend`: `cd frontend`
2. Instalar dependencias: `npm install`
3. Arrancar en modo desarrollo: `npm run dev`
4. El frontend corre en `http://localhost:5173`

### Notas

- Ambos servidores deben estar corriendo simultáneamente para que la app funcione.
- Si no existe ningún usuario admin, se crea automáticamente uno al arrancar el backend con las credenciales `admin` / `ADMIN_PASSWORD`.
