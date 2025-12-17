#!/usr/bin/env python3
"""
Simple Test Script for Devium Project using REST API
Tests all project components without requiring Firebase Admin SDK
"""

import requests
import json
import time
import sys
from datetime import datetime
from typing import Dict, List, Any
import os

class DeviumProjectTester:
    def __init__(self):
        self.results = {
            'passed': [],
            'failed': [],
            'warnings': [],
            'timestamp': datetime.now().isoformat()
        }
        
        # Firebase REST API configuration
        self.firebase_config = {
            "databaseURL": "https://devium-4d44c-default-rtdb.firebaseio.com",
            "apiKey": "AIzaSyCp1CCrgCpyTsCaELhU6y8cyTkVgFP4_fc"
        }
        
        self.base_url = self.firebase_config["databaseURL"]
        self.api_key = self.firebase_config["apiKey"]

    def log_result(self, status: str, message: str, test_name: str = ""):
        """Log test results"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        log_entry = f"[{timestamp}] {status} {message}"
        
        if test_name:
            log_entry = f"[{timestamp}] {status} [{test_name}] {message}"
        
        print(log_entry)
        
        if "✅" in status:
            self.results['passed'].append({"test": test_name, "message": message})
        elif "❌" in status:
            self.results['failed'].append({"test": test_name, "message": message})
        elif "⚠️" in status:
            self.results['warnings'].append({"test": test_name, "message": message})

    def make_firebase_request(self, path: str) -> Dict:
        """Make request to Firebase REST API"""
        try:
            url = f"{self.base_url}/{path}.json"
            params = {'key': self.api_key}
            
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                return response.json()
            else:
                self.log_result("❌", f"Firebase API request failed: {response.status_code}", "API Request")
                return None
                
        except Exception as e:
            self.log_result("❌", f"Firebase API request error: {str(e)}", "API Request")
            return None

    def test_firebase_connection(self):
        """Test Firebase connection using REST API"""
        print("\n" + "="*50)
        print("🔥 TESTING FIREBASE CONNECTION")
        print("="*50)
        
        try:
            # Test root access
            root_data = self.make_firebase_request("")
            
            if root_data is not None:
                self.log_result("✅", "Successfully connected to Firebase via REST API", "Firebase Connection")
                
                if isinstance(root_data, dict):
                    collections = list(root_data.keys())
                    self.log_result("✅", f"Found collections: {collections}", "Firebase Collections")
                    
                    # Test each collection
                    for collection in collections:
                        collection_data = self.make_firebase_request(collection)
                        if collection_data is not None:
                            if isinstance(collection_data, dict):
                                count = len(collection_data)
                                self.log_result("✅", f"Collection '{collection}' has {count} items", "Collection Check")
                            else:
                                self.log_result("✅", f"Collection '{collection}' exists", "Collection Check")
                        else:
                            self.log_result("⚠️", f"Collection '{collection}' is empty or inaccessible", "Collection Check")
                else:
                    self.log_result("⚠️", "Root data is not a dictionary", "Firebase Structure")
            else:
                self.log_result("❌", "Failed to connect to Firebase", "Firebase Connection")
                
        except Exception as e:
            self.log_result("❌", f"Firebase connection test failed: {str(e)}", "Firebase Connection")

    def test_user_roles(self):
        """Test user roles and authentication"""
        print("\n" + "="*50)
        print("👥 TESTING USER ROLES & AUTHENTICATION")
        print("="*50)
        
        try:
            users = self.make_firebase_request('users')
            
            if users:
                role_counts = {'admin': 0, 'manager': 0, 'developer': 0, 'tester': 0, 'unknown': 0}
                
                for user_id, user_data in users.items():
                    if isinstance(user_data, dict):
                        role = user_data.get('role', 'unknown')
                        name = user_data.get('name', 'Unknown')
                        email = user_data.get('email', 'No email')
                        
                        if role in role_counts:
                            role_counts[role] += 1
                            self.log_result("✅", f"User {name} ({email}) - Role: {role}", "User Role Check")
                        else:
                            role_counts['unknown'] += 1
                            self.log_result("⚠️", f"User {name} has unknown role: {role}", "User Role Check")
                
                # Report role distribution
                total_users = sum(role_counts.values())
                self.log_result("✅", f"Total users: {total_users}", "User Statistics")
                for role, count in role_counts.items():
                    if count > 0:
                        self.log_result("✅", f"{role.capitalize()}s: {count}", "Role Distribution")
            else:
                self.log_result("❌", "No users found in database", "User Roles")
                
        except Exception as e:
            self.log_result("❌", f"User role test failed: {str(e)}", "User Roles")

    def test_teams_structure(self):
        """Test teams and team members"""
        print("\n" + "="*50)
        print("🏢 TESTING TEAMS STRUCTURE")
        print("="*50)
        
        try:
            teams = self.make_firebase_request('teams')
            
            if teams:
                total_teams = len(teams) if isinstance(teams, dict) else 0
                self.log_result("✅", f"Found {total_teams} teams", "Teams Count")
                
                for team_id, team_data in teams.items():
                    if isinstance(team_data, dict):
                        team_name = team_data.get('name', f'Team {team_id}')
                        members = team_data.get('members', [])
                        
                        if isinstance(members, list):
                            member_count = len(members)
                            self.log_result("✅", f"Team '{team_name}' has {member_count} members", "Team Details")
                            
                            # Check if team has projects
                            projects = team_data.get('projects', [])
                            if projects:
                                self.log_result("✅", f"Team '{team_name}' has {len(projects)} projects", "Team Projects")
                        else:
                            self.log_result("⚠️", f"Team '{team_name}' has invalid members structure", "Team Details")
            else:
                self.log_result("❌", "No teams found in database", "Teams Structure")
                
        except Exception as e:
            self.log_result("❌", f"Teams structure test failed: {str(e)}", "Teams Structure")

    def test_projects_structure(self):
        """Test projects and their assignments"""
        print("\n" + "="*50)
        print("📋 TESTING PROJECTS STRUCTURE")
        print("="*50)
        
        try:
            projects = self.make_firebase_request('projects')
            
            if projects:
                total_projects = len(projects) if isinstance(projects, dict) else 0
                self.log_result("✅", f"Found {total_projects} projects", "Projects Count")
                
                for project_id, project_data in projects.items():
                    if isinstance(project_data, dict):
                        project_name = project_data.get('name', f'Project {project_id}')
                        team_id = project_data.get('teamId', 'No team')
                        status = project_data.get('status', 'Unknown')
                        
                        self.log_result("✅", f"Project '{project_name}' - Team: {team_id}, Status: {status}", "Project Details")
                        
                        # Check assigned members
                        assigned_members = project_data.get('assignedMembers', [])
                        if assigned_members:
                            self.log_result("✅", f"Project '{project_name}' has {len(assigned_members)} assigned members", "Project Assignment")
                        
                        # Check project metadata
                        created_at = project_data.get('createdAt')
                        if created_at:
                            self.log_result("✅", f"Project '{project_name}' has creation timestamp", "Project Metadata")
            else:
                self.log_result("❌", "No projects found in database", "Projects Structure")
                
        except Exception as e:
            self.log_result("❌", f"Projects structure test failed: {str(e)}", "Projects Structure")

    def test_chat_system(self):
        """Test chat system functionality"""
        print("\n" + "="*50)
        print("💬 TESTING CHAT SYSTEM")
        print("="*50)
        
        try:
            # Test conversations
            conversations = self.make_firebase_request('conversations')
            
            if conversations:
                total_conversations = len(conversations) if isinstance(conversations, dict) else 0
                self.log_result("✅", f"Found {total_conversations} conversations", "Chat Conversations")
                
                for conv_id, conv_data in conversations.items():
                    if isinstance(conv_data, dict):
                        conv_name = conv_data.get('name', f'Conversation {conv_id}')
                        conv_type = conv_data.get('type', 'Unknown')
                        participants = conv_data.get('participants', [])
                        
                        self.log_result("✅", f"Conversation '{conv_name}' - Type: {conv_type}, Participants: {len(participants)}", "Conversation Details")
                        
                        # Check messages for this conversation
                        messages = self.make_firebase_request(f'messages/{conv_id}')
                        if messages:
                            message_count = len(messages) if isinstance(messages, dict) else 0
                            self.log_result("✅", f"Conversation '{conv_name}' has {message_count} messages", "Message Count")
            else:
                self.log_result("⚠️", "No conversations found in database", "Chat System")
            
            # Test users presence
            users_presence = self.make_firebase_request('users')
            if users_presence:
                online_users = 0
                for user_id, user_data in users_presence.items():
                    if isinstance(user_data, dict) and user_data.get('isOnline'):
                        online_users += 1
                
                self.log_result("✅", f"Users online: {online_users}", "User Presence")
                
        except Exception as e:
            self.log_result("❌", f"Chat system test failed: {str(e)}", "Chat System")

    def test_dependencies(self):
        """Test project dependencies and packages"""
        print("\n" + "="*50)
        print("📦 TESTING DEPENDENCIES")
        print("="*50)
        
        # Check package.json
        try:
            with open('package.json', 'r') as f:
                package_data = json.load(f)
            
            dependencies = package_data.get('dependencies', {})
            dev_dependencies = package_data.get('devDependencies', {})
            
            self.log_result("✅", f"Found {len(dependencies)} production dependencies", "Dependencies")
            self.log_result("✅", f"Found {len(dev_dependencies)} development dependencies", "Dev Dependencies")
            
            # Check critical dependencies
            critical_deps = ['react', 'firebase', '@mui/material', 'react-router-dom', 'notistack']
            for dep in critical_deps:
                if dep in dependencies:
                    version = dependencies[dep]
                    self.log_result("✅", f"Critical dependency {dep}: {version}", "Critical Dependencies")
                else:
                    self.log_result("❌", f"Missing critical dependency: {dep}", "Critical Dependencies")
                
        except Exception as e:
            self.log_result("❌", f"Package.json test failed: {str(e)}", "Dependencies")

    def test_file_structure(self):
        """Test project file structure"""
        print("\n" + "="*50)
        print("📁 TESTING FILE STRUCTURE")
        print("="*50)
        
        critical_files = [
            'src/App.tsx',
            'src/firebase.ts',
            'src/contexts/AuthContext.tsx',
            'src/contexts/ChatContext.tsx',
            'src/services/firebaseChatService.ts',
            'package.json',
            '.env'
        ]
        
        for file_path in critical_files:
            if os.path.exists(file_path):
                self.log_result("✅", f"File exists: {file_path}", "File Structure")
            else:
                self.log_result("❌", f"Missing file: {file_path}", "File Structure")

    def test_role_based_routing(self):
        """Test role-based routing configuration"""
        print("\n" + "="*50)
        print("🛣️ TESTING ROLE-BASED ROUTING")
        print("="*50)
        
        try:
            with open('src/App.tsx', 'r') as f:
                app_content = f.read()
            
            # Check for ProtectedRoute component
            if 'ProtectedRoute' in app_content:
                self.log_result("✅", "ProtectedRoute component found", "Routing Configuration")
            else:
                self.log_result("❌", "ProtectedRoute component not found", "Routing Configuration")
            
            # Check for role-based access
            if 'allowedRoles' in app_content:
                self.log_result("✅", "Role-based access control implemented", "Routing Configuration")
            else:
                self.log_result("❌", "Role-based access control not found", "Routing Configuration")
            
            # Check for different role routes
            roles = ['admin', 'manager', 'developer', 'tester']
            found_roles = []
            for role in roles:
                if role in app_content.lower():
                    found_roles.append(role)
            
            if found_roles:
                self.log_result("✅", f"Role routes found for: {', '.join(found_roles)}", "Role Routes")
            else:
                self.log_result("❌", "No role-specific routes found", "Role Routes")
                
        except Exception as e:
            self.log_result("❌", f"Role-based routing test failed: {str(e)}", "Routing Configuration")

    def test_firebase_chat_service(self):
        """Test Firebase chat service implementation"""
        print("\n" + "="*50)
        print("🔧 TESTING FIREBASE CHAT SERVICE")
        print("="*50)
        
        try:
            with open('src/services/firebaseChatService.ts', 'r') as f:
                chat_service_content = f.read()
            
            # Check for key methods
            required_methods = [
                'createConversation',
                'sendMessage',
                'subscribeToConversations',
                'subscribeToMessages',
                'updateUserOnlineStatus'
            ]
            
            for method in required_methods:
                if method in chat_service_content:
                    self.log_result("✅", f"Method {method} found in chat service", "Chat Service Methods")
                else:
                    self.log_result("❌", f"Method {method} missing from chat service", "Chat Service Methods")
            
            # Check for Firebase imports
            if 'firebase/database' in chat_service_content:
                self.log_result("✅", "Firebase database imports found", "Chat Service Imports")
            else:
                self.log_result("❌", "Firebase database imports missing", "Chat Service Imports")
                
        except Exception as e:
            self.log_result("❌", f"Chat service test failed: {str(e)}", "Chat Service")

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 STARTING COMPREHENSIVE DEVIUM PROJECT TEST")
        print("=" * 60)
        print(f"Test started at: {self.results['timestamp']}")
        print("=" * 60)
        
        # Run all test suites
        self.test_firebase_connection()
        self.test_user_roles()
        self.test_teams_structure()
        self.test_projects_structure()
        self.test_chat_system()
        self.test_dependencies()
        self.test_file_structure()
        self.test_role_based_routing()
        self.test_firebase_chat_service()
        
        # Generate final report
        self.generate_report()

    def generate_report(self):
        """Generate final test report"""
        print("\n" + "="*60)
        print("📊 FINAL TEST REPORT")
        print("="*60)
        
        passed_count = len(self.results['passed'])
        failed_count = len(self.results['failed'])
        warning_count = len(self.results['warnings'])
        total_tests = passed_count + failed_count + warning_count
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_count}")
        print(f"❌ Failed: {failed_count}")
        print(f"⚠️ Warnings: {warning_count}")
        
        if failed_count == 0:
            print("\n🎉 ALL CRITICAL TESTS PASSED!")
        else:
            print(f"\n⚠️ {failed_count} tests failed - attention needed")
        
        # Save detailed report
        report_data = {
            'summary': {
                'total': total_tests,
                'passed': passed_count,
                'failed': failed_count,
                'warnings': warning_count,
                'success_rate': (passed_count / total_tests * 100) if total_tests > 0 else 0
            },
            'details': self.results
        }
        
        with open('test_report.json', 'w') as f:
            json.dump(report_data, f, indent=2)
        
        print(f"\n📄 Detailed report saved to: test_report.json")
        
        # Show failed tests if any
        if self.results['failed']:
            print("\n❌ FAILED TESTS:")
            for failure in self.results['failed']:
                print(f"  - [{failure['test']}] {failure['message']}")
        
        # Show warnings if any
        if self.results['warnings']:
            print("\n⚠️ WARNINGS:")
            for warning in self.results['warnings']:
                print(f"  - [{warning['test']}] {warning['message']}")

if __name__ == "__main__":
    tester = DeviumProjectTester()
    tester.run_all_tests()
