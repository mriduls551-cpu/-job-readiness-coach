import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import type { ResumeDraft } from '@/lib/product';

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 48,
    paddingLeft: 52,
    paddingRight: 52,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1e293b',
    lineHeight: 1.4,
  },
  // Header
  name: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
    color: '#0f172a',
  },
  contact: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 20,
  },
  // Section
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.2,
    color: '#64748b',
    textTransform: 'uppercase',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 3,
    marginBottom: 8,
    marginTop: 16,
  },
  // Summary
  summary: {
    fontSize: 10,
    color: '#334155',
    lineHeight: 1.6,
  },
  // Skills
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  skill: {
    fontSize: 9,
    backgroundColor: '#f1f5f9',
    color: '#334155',
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 7,
    paddingRight: 7,
    borderRadius: 3,
  },
  // Experience / Education entries
  entryWrapper: {
    marginBottom: 10,
  },
  entryTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  entryMeta: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 1,
    marginBottom: 3,
  },
  entryDesc: {
    fontSize: 9,
    color: '#334155',
    lineHeight: 1.5,
  },
});

function ResumePDF({ resume }: { resume: ResumeDraft }) {
  const contactParts = [resume.email, resume.phone, resume.location].filter(Boolean);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <Text style={styles.name}>{resume.title || 'Your Name'}</Text>
        {contactParts.length > 0 && (
          <Text style={styles.contact}>{contactParts.join('  •  ')}</Text>
        )}

        {/* Summary */}
        {resume.summary ? (
          <>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.summary}>{resume.summary}</Text>
          </>
        ) : null}

        {/* Skills */}
        {resume.skills.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.skillsRow}>
              {resume.skills.map((skill, i) => (
                <Text key={i} style={styles.skill}>{skill}</Text>
              ))}
            </View>
          </>
        ) : null}

        {/* Experience */}
        {resume.experience.some((e) => e.company || e.role) ? (
          <>
            <Text style={styles.sectionTitle}>Experience</Text>
            {resume.experience.map((exp, i) => (
              <View key={i} style={styles.entryWrapper}>
                <Text style={styles.entryTitle}>
                  {[exp.role, exp.company].filter(Boolean).join(' • ')}
                </Text>
                {exp.duration ? (
                  <Text style={styles.entryMeta}>{exp.duration}</Text>
                ) : null}
                {exp.description ? (
                  <Text style={styles.entryDesc}>{exp.description}</Text>
                ) : null}
              </View>
            ))}
          </>
        ) : null}

        {/* Education */}
        {resume.education.some((e) => e.school || e.degree) ? (
          <>
            <Text style={styles.sectionTitle}>Education</Text>
            {resume.education.map((edu, i) => (
              <View key={i} style={styles.entryWrapper}>
                <Text style={styles.entryTitle}>
                  {[edu.degree, edu.school].filter(Boolean).join(' • ')}
                </Text>
                <Text style={styles.entryMeta}>
                  {[edu.field, edu.year].filter(Boolean).join(' • ')}
                </Text>
              </View>
            ))}
          </>
        ) : null}

        {/* Certifications */}
        {resume.certifications.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Certifications</Text>
            <View style={styles.skillsRow}>
              {resume.certifications.map((cert, i) => (
                <Text key={i} style={styles.skill}>{cert}</Text>
              ))}
            </View>
          </>
        ) : null}
      </Page>
    </Document>
  );
}

export async function createResumePdf(resume: ResumeDraft): Promise<Buffer> {
  const instance = pdf(<ResumePDF resume={resume} />);
  // @react-pdf/renderer types toBuffer() as ReadableStream in some versions but returns Buffer at runtime
  return instance.toBuffer() as unknown as Promise<Buffer>;
}
