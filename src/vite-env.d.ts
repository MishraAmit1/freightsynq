/// <reference types="vite/client" />



// @tailwind base;
// @tailwind components;
// @tailwind utilities;

// /* Yellow & Black Dashboard Theme inspired by the Pistachio design */
// @layer base {
//   :root {
//     /* Main color system - Dark theme as default */
//     --background: 0 0% 4%;
//     /* #0A0A0A - Black background */
//     --foreground: 0 0% 98%;
//     /* White text */
//     --card: 0 0% 8%;
//     /* Dark cards */
//     --card-foreground: 0 0% 98%;
//     /* White text on cards */
//     --popover: 0 0% 8%;
//     --popover-foreground: 0 0% 98%;

//     /* Primary yellow accents (where blue was) */
//     --primary: 48 100% 68%;
//     /* #FFD75F - Yellow accents */
//     --primary-foreground: 0 0% 4%;
//     /* Black text on yellow */
//     --primary-hover: 48 100% 75%;
//     /* Brighter yellow on hover */
//     --primary-glow: 48 100% 75%;
//     /* Glow effect */

//     /* Secondary grays */
//     --secondary: 0 0% 15%;
//     /* Dark gray */
//     --secondary-foreground: 0 0% 80%;
//     /* #CCCCCC text */
//     --secondary-hover: 0 0% 20%;
//     /* Darker gray on hover */

//     --muted: 0 0% 12%;
//     --muted-foreground: 0 0% 65%;
//     /* #CCCCCC for muted text */

//     --accent: 0 0% 15%;
//     /* Dark accent */
//     --accent-foreground: 48 100% 68%;
//     /* Yellow text */

//     /* Status colors */
//     --success: 142 76% 36%;
//     --success-foreground: 0 0% 98%;
//     --warning: 38 92% 50%;
//     --warning-foreground: 0 0% 4%;
//     --destructive: 0 84% 60%;
//     --destructive-foreground: 0 0% 98%;
//     --info: 199 89% 48%;
//     --info-foreground: 0 0% 98%;

//     /* Borders and inputs - Dark theme */
//     --border: 0 0% 20%;
//     /* Dark borders */
//     --input: 0 0% 12%;
//     /* Dark input background */
//     --ring: 48 100% 68%;
//     /* Yellow focus ring */

//     /* Dashboard specific gradients */
//     --gradient-primary: linear-gradient(135deg, hsl(48 100% 68%), hsl(48 100% 75%));
//     --gradient-dark: linear-gradient(135deg, hsl(0 0% 4%), hsl(0 0% 12%));
//     --gradient-card: linear-gradient(135deg, hsl(0 0% 8%), hsl(0 0% 12%));

//     /* Shadows with subtle glow */
//     --shadow-sm: 0 1px 2px 0 hsl(0 0% 0% / 0.3);
//     --shadow-md: 0 4px 6px -1px hsl(0 0% 0% / 0.4);
//     --shadow-lg: 0 10px 15px -3px hsl(0 0% 0% / 0.5);
//     --shadow-yellow: 0 4px 20px hsl(48 100% 68% / 0.3);

//     --radius: 0.75rem;

//     /* Sidebar colors */
//     --sidebar-background: 0 0% 4%;
//     /* #0A0A0A */
//     --sidebar-foreground: 0 0% 98%;
//     /* White text */
//     --sidebar-primary: 48 100% 68%;
//     /* Yellow */
//     --sidebar-primary-foreground: 0 0% 4%;
//     /* Black text */
//     --sidebar-accent: 0 0% 12%;
//     /* Dark gray accent */
//     --sidebar-accent-foreground: 0 0% 98%;
//     --sidebar-border: 0 0% 20%;
//     --sidebar-ring: 48 100% 68%;
//   }

//   .dark {
//     /* Light mode override (optional) */
//     --background: 0 0% 98%;
//     --foreground: 0 0% 4%;
//     --card: 0 0% 100%;
//     --card-foreground: 0 0% 4%;
//     --popover: 0 0% 100%;
//     --popover-foreground: 0 0% 4%;

//     --primary: 48 100% 68%;
//     --primary-foreground: 0 0% 4%;
//     --primary-hover: 48 100% 60%;

//     --secondary: 0 0% 90%;
//     --secondary-foreground: 0 0% 4%;
//     --secondary-hover: 0 0% 85%;

//     --muted: 0 0% 96%;
//     --muted-foreground: 0 0% 45%;

//     --accent: 0 0% 96%;
//     --accent-foreground: 0 0% 4%;

//     --border: 0 0% 90%;
//     --input: 0 0% 96%;
//     --ring: 48 100% 68%;

//     --sidebar-background: 0 0% 98%;
//     --sidebar-foreground: 0 0% 4%;
//     --sidebar-primary: 48 100% 68%;
//     --sidebar-primary-foreground: 0 0% 4%;
//     --sidebar-accent: 0 0% 96%;
//     --sidebar-accent-foreground: 0 0% 4%;
//     --sidebar-border: 0 0% 90%;
//     --sidebar-ring: 48 100% 68%;
//   }
// }

// @layer base {
//   * {
//     @apply border-border;
//   }

//   body {
//     @apply bg-background text-foreground;
//   }
// }

// /* Custom dashboard components */
// @layer components {

//   /* Yellow accent button (where blue was) */
//   .btn-primary {
//     @apply bg-primary text-primary-foreground hover:bg-primary-hover transition-colors font-medium;
//     box-shadow: var(--shadow-yellow);
//   }

//   /* Dark secondary button */
//   .btn-secondary {
//     @apply bg-secondary text-secondary-foreground hover:bg-secondary-hover transition-colors;
//   }

//   /* Chart colors for dashboard */
//   .chart-yellow {
//     fill: hsl(48 100% 68%);
//     stroke: hsl(48 100% 68%);
//   }

//   .chart-dark {
//     fill: hsl(0 0% 15%);
//     stroke: hsl(0 0% 15%);
//   }

//   .chart-gray {
//     fill: hsl(0 0% 65%);
//     stroke: hsl(0 0% 65%);
//   }

//   /* Dashboard card styling - Dark cards */
//   .dashboard-card {
//     @apply bg-card border border-border rounded-lg shadow-md p-6 text-card-foreground;
//     background: var(--gradient-card);
//   }

//   /* Metric cards with yellow accents */
//   .metric-card {
//     @apply dashboard-card relative overflow-hidden;
//   }

//   .metric-card::before {
//     content: '';
//     position: absolute;
//     top: 0;
//     left: 0;
//     width: 100%;
//     height: 4px;
//     background: var(--gradient-primary);
//   }

//   /* Status indicators - Dark theme friendly */
//   .status-pending {
//     @apply bg-yellow-900/20 text-yellow-400 border-yellow-800/30;
//   }

//   .status-delivered {
//     @apply bg-green-900/20 text-green-400 border-green-800/30;
//   }

//   .status-cancelled {
//     @apply bg-red-900/20 text-red-400 border-red-800/30;
//   }

//   /* Navigation active state with yellow */
//   .nav-active {
//     @apply bg-primary text-primary-foreground;
//   }

//   /* Input styling for dark theme */
//   .input-dark {
//     @apply bg-input border-border text-foreground placeholder:text-muted-foreground;
//   }
// }