/**
 * Migrate data from SQLite to Supabase PostgreSQL
 * Usage: npx ts-node scripts/migrate-to-supabase.ts
 *
 * Prerequisites:
 * 1. Create Supabase project at https://supabase.com
 * 2. Set environment variables:
 *    - NEXT_PUBLIC_SUPABASE_URL
 *    - SUPABASE_SERVICE_ROLE_KEY
 * 3. Run this script
 */

import { createClient } from '@supabase/supabase-js';
import { getDatabase, closeDatabase } from '../src/lib/db/init';
import { Users, Assessments, Resumes, Applications, ActionPlans } from '../src/lib/db/models';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  try {
    console.log('🚀 Starting migration from SQLite to Supabase...\n');

    // Initialize local database
    const db = getDatabase();

    // 1. Migrate Users
    console.log('👥 Migrating users...');
    const users = Users.getAll();
    for (const user of users) {
      const { error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          created_at: user.created_at,
          updated_at: user.updated_at,
        });
      if (error) {
        console.error('   ❌ Error migrating user:', user.email, error);
      }
    }
    console.log(`   ✅ Migrated ${users.length} users\n`);

    // 2. Migrate Assessments
    console.log('📊 Migrating assessments...');
    let assessmentCount = 0;
    for (const user of users) {
      const assessments = Assessments.findByUserId(user.id);
      for (const assessment of assessments) {
        const { error } = await supabase
          .from('assessments')
          .upsert({
            id: assessment.id,
            user_id: assessment.user_id,
            type: assessment.type,
            responses: assessment.responses,
            role_scores: assessment.role_scores,
            selected_role: assessment.selected_role,
            status: assessment.status,
            completed_at: assessment.completed_at,
            created_at: assessment.created_at,
            updated_at: assessment.updated_at,
          });
        if (error) {
          console.error('   ❌ Error migrating assessment:', assessment.id, error);
        } else {
          assessmentCount++;
        }
      }
    }
    console.log(`   ✅ Migrated ${assessmentCount} assessments\n`);

    // 3. Migrate Resumes
    console.log('📄 Migrating resumes...');
    let resumeCount = 0;
    for (const user of users) {
      const resume = Resumes.findByUserId(user.id);
      if (resume) {
        const { error } = await supabase
          .from('resumes')
          .upsert({
            id: resume.id,
            user_id: resume.user_id,
            title: resume.title,
            summary: resume.summary,
            email: resume.email,
            phone: resume.phone,
            location: resume.location,
            skills: resume.skills,
            experience: resume.experience,
            education: resume.education,
            certifications: resume.certifications,
            projects: resume.projects,
            created_at: resume.created_at,
            updated_at: resume.updated_at,
          });
        if (error) {
          console.error('   ❌ Error migrating resume:', resume.id, error);
        } else {
          resumeCount++;
        }
      }
    }
    console.log(`   ✅ Migrated ${resumeCount} resumes\n`);

    // 4. Migrate Applications
    console.log('💼 Migrating applications...');
    let appCount = 0;
    for (const user of users) {
      const applications = Applications.findByUserId(user.id);
      for (const app of applications) {
        const { error } = await supabase
          .from('applications')
          .upsert({
            id: app.id,
            user_id: app.user_id,
            company_name: app.company_name,
            role_title: app.role_title,
            status: app.status,
            application_date: app.application_date,
            notes: app.notes,
            created_at: app.created_at,
            updated_at: app.updated_at,
          });
        if (error) {
          console.error('   ❌ Error migrating application:', app.id, error);
        } else {
          appCount++;
        }
      }
    }
    console.log(`   ✅ Migrated ${appCount} applications\n`);

    // 5. Migrate Action Plans
    console.log('🎯 Migrating action plans...');
    let planCount = 0;
    for (const user of users) {
      const plans = ActionPlans.findByUserId(user.id);
      for (const plan of plans) {
        const { error } = await supabase
          .from('action_plans')
          .upsert({
            id: plan.id,
            user_id: plan.user_id,
            week_number: plan.week_number,
            tasks: plan.tasks,
            status: plan.status,
            generated_at: plan.generated_at,
            created_at: plan.created_at,
            updated_at: plan.updated_at,
          });
        if (error) {
          console.error('   ❌ Error migrating action plan:', plan.id, error);
        } else {
          planCount++;
        }
      }
    }
    console.log(`   ✅ Migrated ${planCount} action plans\n`);

    console.log('✅ Migration complete!\n');
    console.log('📊 Summary:');
    console.log(`   Users: ${users.length}`);
    console.log(`   Assessments: ${assessmentCount}`);
    console.log(`   Resumes: ${resumeCount}`);
    console.log(`   Applications: ${appCount}`);
    console.log(`   Action Plans: ${planCount}`);
    console.log('\n🎉 All data successfully migrated to Supabase!\n');

    closeDatabase();

  } catch (error) {
    console.error('❌ Migration failed:', error);
    closeDatabase();
    process.exit(1);
  }
}

migrate();
