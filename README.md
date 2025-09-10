# FreightSynq - Booking Service

A professional freight booking and logistics management platform built with React, TypeScript, and TailwindCSS.

## 🚀 Features

### Core Functionality
- **Dashboard Overview** - Real-time statistics and quick actions
- **Booking Management** - Complete booking lifecycle from creation to delivery
- **Multi-step Booking Creation** - Guided wizard for creating new bookings
- **Advanced Filtering** - Search and filter bookings by status, dates, parties
- **Assignment System** - Assign transporters, vehicles, and drivers
- **Document Management** - Upload and manage booking-related documents
- **Timeline Tracking** - Complete audit trail of booking events

### User Interface
- **Professional Design** - Clean, modern interface optimized for logistics workflows
- **Responsive Layout** - Works seamlessly on desktop, tablet, and mobile
- **Dark/Light Mode** - Automatic theme detection with manual override
- **Accessible Design** - WCAG 2.1 AA compliant with keyboard navigation
- **Real-time Updates** - Live status updates and notifications

### Technical Features
- **TypeScript** - Full type safety throughout the application
- **React Query** - Efficient data fetching and caching
- **Form Validation** - Robust validation using React Hook Form + Zod
- **Component Library** - Beautiful, reusable UI components
- **Mock API** - Complete mock data for development and testing

## 🛠️ Technology Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS with custom design system
- **UI Components**: Shadcn/ui (Radix UI primitives)
- **Form Handling**: React Hook Form with Zod validation
- **Data Fetching**: TanStack Query (React Query)
- **Routing**: React Router v6
- **Icons**: Lucide React
- **State Management**: React Context + React Query

## 📁 Project Structure

```
src/
├── components/
│   ├── layout/           # Layout components (Sidebar, TopBar, MainLayout)
│   └── ui/              # Reusable UI components (Button, Card, Input, etc.)
├── features/
│   └── bookings/        # Booking-specific components and logic
│       ├── BookingList.tsx
│       ├── BookingForm.tsx
│       ├── BookingDetail.tsx
│       └── AssignmentDrawer.tsx
├── pages/               # Page components (Dashboard, NotFound)
├── hooks/               # Custom React hooks
├── lib/                 # Utilities and mock data
└── styles/              # Global styles and design tokens
```

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Modern web browser

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd freightsynq

# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

## 📋 Booking Statuses

The system supports the following booking statuses:

- **DRAFT** - Initial booking creation
- **QUOTED** - Price quote generated
- **CONFIRMED** - Booking confirmed with LR generated
- **DISPATCHED** - Assigned to transporter
- **IN_TRANSIT** - Shipment in progress
- **DELIVERED** - Successfully delivered
- **CANCELLED** - Booking cancelled

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the project root:

```env
VITE_API_BASE_URL=https://api.freightsynq.com
VITE_APP_ENVIRONMENT=development
```

### API Integration
The application is designed to work with the FreightSynq API. Update the API endpoints in `src/api/` directory to connect to your backend services.

## 🧪 Testing

The application includes:
- Unit tests for components
- Integration tests for booking flows
- Mock data for development
- API contract testing setup

```bash
npm run test         # Run test suite
npm run test:watch   # Run tests in watch mode
npm run coverage     # Generate coverage report
```

## 📱 Responsive Design

FreightSynq is fully responsive and optimized for:
- **Desktop** - Full feature set with sidebar navigation
- **Tablet** - Adaptive layout with collapsible sidebar
- **Mobile** - Touch-optimized interface with drawer navigation

## ♿ Accessibility

- Semantic HTML structure
- ARIA labels and descriptions
- Keyboard navigation support
- Screen reader compatibility
- High contrast color scheme
- Focus management

## 🎨 Design System

The application uses a custom design system with:
- **Color Palette** - Professional navy blue with status-specific colors
- **Typography** - Hierarchical text styling
- **Spacing** - Consistent spacing scale
- **Components** - Reusable, themed components
- **Animations** - Subtle, professional transitions

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Deployment Options
- **Vercel** - Automatic deployments with preview builds
- **Netlify** - Static site hosting with form handling
- **AWS S3** - Static website hosting
- **Docker** - Containerized deployment

## 📖 Usage Guide

### Creating a Booking
1. Navigate to Bookings → New Booking
2. Fill in consignor and consignee details
3. Specify route and cargo information
4. Set pickup date and service type
5. Review and confirm to generate LR

### Managing Bookings
- Use the bookings list to view all bookings
- Filter by status, date range, or search terms
- Click on any booking to view detailed information
- Use the tabs to access different aspects (Overview, Assignment, Documents, Timeline)

### Assignment Process
1. Open a confirmed booking
2. Navigate to the Assignment tab
3. Click "Assign Transport"
4. Select transporter, vehicle, and driver
5. Choose notification channels
6. Confirm assignment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation wiki

---

**FreightSynq** - Streamlining freight operations with modern technology.