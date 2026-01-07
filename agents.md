Product Requirements Document (PRD)
Sports Club Management SaaS
1. Introduction
The Sports Club Management SaaS is a web-based application designed to manage multi-club operations across multiple sports, including attendance and student payments via a credit-based system. The platform supports various sports (e.g., football, basketball, tennis) and serves multiple hierarchy levels from superadmins managing the platform to students attending training sessions.
2. User Roles & Permissions
Role	Description	Key Responsibilities
Superadmin	System Owner / Platform Admin	• Create and manage Sports<br>• Create and manage Clubs (Tenants) under Sports<br>• Manage Club Admins (Club Owners)
Admin	Club Owner (e.g., Club A under Football)	• Manage Coaches and Students within their club<br>• Oversee payments and credits<br>• View club-wide reports
Coach	Training Instructor	• Manage assigned student groups for specific sports<br>• Mark/Verify Attendance for training sessions
Student	Player / Member	• View own profile and credit balance<br>• View attendance history
3. Functional Requirements
3.1 Multi-Tenancy / Club Management
Superadmin can create multiple Sports (e.g., Football, Basketball, Tennis) and Clubs under each Sport.
Each Club is associated with a specific Sport and has its own isolated data scope (Admins, Coaches, Students).

3.2 User Management
Superadmin creates Sports and Clubs under each Sport, and assigns Admin accounts to clubs.
Admin creates Coach and Student accounts within their club.
Authentication system for all users.
3.3 Credit & Payment System (Wallet)
System operates on a Credit basis (1 Credit assumed = 1 RM).
Registration Fee: Deducts/Requires 100 Credits.
Monthly Fee: Deducts/Requires 70 Credits.
Top-up Mechanism: Admin can credit user wallets (manual entry upon receiving external payment) or integration with payment gateway (if required in future). for now assumed Admin manages credits manually.
Student Balance: Students must maintain sufficient credit for monthly deductions.
3.4 Attendance System
Coaches or Admins can create sport-specific training sessions for their club.
QR Code Attendance: System generates a unique QR code for each training session.
Scanning: Students scan the QR code using their mobile device to mark their attendance.
Attendance records linked to student profiles and sport-specific sessions.
4. Technical Requirements
Web Application: Responsive web interface.
Containerization: Application must be containerized using Docker for easy deployment.
Database: supabase
Backend/Frontend: Recommend modern stack (e.g., Next.js/React + Node.js or Python/Django) - To be confirmed in Implementation Plan.
5. Deployment
Docker Compose setup for local development and simplified server deployment.
6. Assumptions & Questions
Currency: Credits are pegged 1:1 to currency (RM).
Payment Gateway: Is a real payment gateway (Stripe/ToyyibPay) required, or does the Admin manually top up credits after receiving cash/transfer? Assumption: Manual credit top-up by Admin for MVP.
Attendance Validation: Does attendance deduction happen automatically per session, or is the 70 credit fee a flat monthly subscription regardless of attendance? Assumption: Flat monthly subscription.
Multi-Sport Fees: Fees (registration and monthly) are the same across all sports for simplicity. Sport-specific fees can be added in future iterations if needed.
Sport-Specific Rules: Attendance rules and session types may vary by sport, but for MVP, assume uniform rules across sports.