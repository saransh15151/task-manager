# Task Manager 🚀

A modern, full-stack Task Management application built with React, Node.js, and MongoDB. Organize your life, boost your productivity, and manage your tasks with a sleek, premium interface.

## ✨ Features

- **User Authentication**: Secure signup and login using JWT and Bcrypt.
- **Dynamic Dashboard**: A clean, intuitive interface to view and manage all your tasks.
- **Task Management**: Create, view, update, and delete tasks with ease.
- **Responsive Design**: Optimized for both desktop and mobile devices.
- **Premium UI**: Modern light-themed aesthetic with polished animations and 3D illustrations.
- **Protected Routes**: Secure dashboard access ensuring user data privacy.

## 🛠️ Tech Stack

### Frontend
- **React 19**: Modern UI development.
- **Vite**: Ultra-fast build tool and development server.
- **React Router 7**: Seamless client-side navigation.
- **Axios**: Efficient API communication.
- **Vanilla CSS**: Custom, high-performance styling.

### Backend
- **Node.js & Express**: Robust and scalable server-side environment.
- **MongoDB & Mongoose**: Flexible NoSQL database and elegant object modeling.
- **JSON Web Tokens (JWT)**: Secure stateless authentication.
- **Bcrypt.js**: Industry-standard password hashing.

## 🚀 Getting Started

### Prerequisites
- Node.js (v20.x or higher)
- MongoDB account (local or Atlas)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd task-manager
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   ```
   Create a `.env` file in the `backend` directory and add:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   ```

3. **Setup Frontend**
   ```bash
   cd ../frontend
   npm install
   ```
   Create a `.env` file in the `frontend` directory and add:
   ```env
   VITE_API_URL=http://localhost:5000
   ```

### Running Locally

You can run the application components separately or use the root-level scripts for convenience:

**Using Root Scripts (Recommended):**
```bash
# Install all dependencies (Root & Backend)
npm install

# Start the Backend server from root
npm start
```

**Manual Start:**

**Start Backend:**
```bash
cd backend
npm start
```

**Start Frontend:**
```bash
cd frontend
npm run dev
```

## 🌐 Deployment

This project is configured for easy deployment on platforms like **Railway**.

1. Connect your GitHub repository to Railway.
2. Set the root directory for your services (or use a monorepo setup).
3. Configure environment variables (`MONGO_URI`, `JWT_SECRET`, etc.) in the Railway dashboard.

## 📄 License

This project is licensed under the ISC License.

---

Made with ❤️ by [Your Name/Username]
