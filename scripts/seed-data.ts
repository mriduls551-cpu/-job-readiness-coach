/**
 * Seed data for testing
 * Usage: npx ts-node scripts/seed-data.ts
 */

import { initializeDatabase, closeDatabase } from '../src/lib/db/init';
import { Users, Assessments, Resumes, Applications, ActionPlans } from '../src/lib/db/models';

async function seedData() {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Initialize database
    const db = initializeDatabase();

    // Create test users
    console.log('📝 Creating test users...');
    const user1 = Users.create('john@example.com', 'John Doe');
    const user2 = Users.create('jane@example.com', 'Jane Smith');
    const user3 = Users.create('admin@example.com', 'Admin User');

    console.log('   ✓ Created user:', user1.email);
    console.log('   ✓ Created user:', user2.email);
    console.log('   ✓ Created user:', user3.email, '\n');

    // Create assessments
    console.log('📊 Creating assessments...');
    const assessment1 = Assessments.create(user1.id, 'career_fit', {
      q1: 'Yes',
      q2: 'No',
      q3: 'Maybe',
    });

    const assessment2 = Assessments.create(user2.id, 'quick_check', {
      q1: 'Strongly Agree',
      q2: 'Agree',
    });

    console.log('   ✓ Created assessment:', assessment1.id);
    console.log('   ✓ Created assessment:', assessment2.id, '\n');

    // Complete assessment
    console.log('🎯 Completing assessment...');
    const completed = Assessments.complete(assessment1.id, {
      'Software Engineer': 85,
      'Data Scientist': 72,
      'Product Manager': 68,
    }, 'Software Engineer');
    console.log('   ✓ Assessment completed:', completed?.status, '\n');

    // Create resumes
    console.log('📄 Creating resumes...');
    const resume1 = Resumes.create(user1.id);
    Resumes.update(user1.id, {
      title: 'Fresh Graduate Resume',
      summary: 'Recent CS graduate looking for entry-level software engineering roles',
      email: 'john@example.com',
      phone: '+91-XXXXX-XXXXX',
      location: 'Bangalore, India',
      skills: ['JavaScript', 'React', 'Node.js', 'SQL', 'Git'],
      education: [{
        school: 'ABC University',
        degree: 'Bachelor of Technology',
        field: 'Computer Science',
        year: 2024,
      }],
    });

    const resume2 = Resumes.create(user2.id);
    Resumes.update(user2.id, {
      title: 'Jane Smith - Data Science Resume',
      summary: 'Analytics graduate with SQL and Python skills',
      email: 'jane@example.com',
      skills: ['Python', 'SQL', 'Tableau', 'Excel'],
      certifications: ['Google Analytics Certificate'],
    });

    console.log('   ✓ Created resume for user1');
    console.log('   ✓ Created resume for user2\n');

    // Create applications
    console.log('💼 Creating job applications...');
    const app1 = Applications.create(user1.id, 'Acme Corp', 'Junior Developer');
    const app2 = Applications.create(user1.id, 'TechStart Inc', 'Full Stack Developer');
    const app3 = Applications.create(user2.id, 'Analytics Pro', 'Data Analyst');

    console.log('   ✓ Created application:', app1.company_name);
    console.log('   ✓ Created application:', app2.company_name);
    console.log('   ✓ Created application:', app3.company_name, '\n');

    // Update application status
    console.log('📌 Updating application statuses...');
    Applications.updateStatus(app1.id, 'interview');
    Applications.updateStatus(app2.id, 'applied');
    Applications.updateStatus(app3.id, 'interview');

    console.log('   ✓ Updated statuses\n');

    // Create action plans
    console.log('🎯 Creating action plans...');
    const plan1 = ActionPlans.create(user1.id, 1, [
      { task: 'Practice coding on LeetCode', priority: 'high', completed: false },
      { task: 'Update LinkedIn profile', priority: 'medium', completed: false },
      { task: 'Prepare for interviews', priority: 'high', completed: false },
    ]);

    const plan2 = ActionPlans.create(user2.id, 1, [
      { task: 'Build a data analysis project', priority: 'high', completed: false },
      { task: 'Study SQL advanced concepts', priority: 'medium', completed: false },
    ]);

    console.log('   ✓ Created action plan for user1');
    console.log('   ✓ Created action plan for user2\n');

    // Display summary
    console.log('✅ Database seeding completed!\n');
    console.log('📊 SUMMARY:');
    console.log('   Users:', Users.getAll().length);
    console.log('   Assessments:', Assessments.findByUserId(user1.id).length + Assessments.findByUserId(user2.id).length);
    console.log('   Resumes:', 2);
    console.log('   Applications:', Applications.findByUserId(user1.id).length + Applications.findByUserId(user2.id).length);
    console.log('   Action Plans:', ActionPlans.findByUserId(user1.id).length + ActionPlans.findByUserId(user2.id).length);
    console.log('\n🎉 Database is ready for testing!\n');

    // Close database
    closeDatabase();

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedData();
