// src/app/components/AdminPanel.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { WikiAPI } from '@/lib/wiki-api'
import { PendingChange, PageRevision, UserProfile } from '@/types/wiki'
import { formatDate, timeSince } from '@/lib/wiki-utils'

interface AdminPanelProps {
  userProfile: UserProfile | null
}

export default function AdminPanel({ userProfile }: AdminPanelProps) {
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([])
  const [recentChanges, setRecentChanges] = useState<PageRevision[]>([])
  const [stats, setStats] = useState({
    totalPages: 0,
    totalRevisions: 0,
    totalUsers: 0,
    totalCategories: 0
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pending' | 'recent' | 'stats'>('pending')
  const [reviewComment, setReviewComment] = useState('')
  const [reviewingChange, setReviewingChange] = useState<string | null>(null)

  useEffect(() => {
    if (userProfile?.is_admin || userProfile?.is_moderator) {
      loadAdminData()
    }
  }, [userProfile])

  const loadAdminData = async () => {
    try {
      setLoading(true)
      const [pending, recent, statistics] = await Promise.all([
        WikiAPI.getPendingChanges(),
        WikiAPI.getRecentChanges(20),
        WikiAPI.getPageStats()
      ])
      
      setPendingChanges(pending)
      setRecentChanges(recent)
      setStats(statistics)
    } catch (error) {
      console.error('Error loading admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (changeId: string, status: 'approved' | 'rejected') => {
    if (!userProfile?.id) return

    try {
      await WikiAPI.reviewChange(changeId, status, reviewComment, userProfile.id)
      await loadAdminData()
      setReviewingChange(null)
      setReviewComment('')
    } catch (error) {
      console.error('Error reviewing change:', error)
    }
  }

  if (!userProfile?.is_admin && !userProfile?.is_moderator) {
    return (
      <div className="content">
        <h1 style={{ color: '#ff6666' }}>Access Denied</h1>
        <p>You need administrator privileges to access this page.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="content">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          Loading admin panel...
        </div>
      </div>
    )
  }

  return (
    <div className="content">
      <h1 style={{ color: '#ff6666', marginBottom: '20px' }}>🛡️ Admin Panel</h1>

      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '5px', 
        marginBottom: '20px',
        borderBottom: '1px solid #666'
      }}>
        <button
          onClick={() => setActiveTab('pending')}
          style={{
            padding: '8px 16px',
            background: activeTab === 'pending' ? '#333' : 'transparent',
            border: '1px solid #666',
            color: activeTab === 'pending' ? '#fff' : '#ccc',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Pending Changes ({pendingChanges.length})
        </button>
        <button
          onClick={() => setActiveTab('recent')}
          style={{
            padding: '8px 16px',
            background: activeTab === 'recent' ? '#333' : 'transparent',
            border: '1px solid #666',
            color: activeTab === 'recent' ? '#fff' : '#ccc',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Recent Changes
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          style={{
            padding: '8px 16px',
            background: activeTab === 'stats' ? '#333' : 'transparent',
            border: '1px solid #666',
            color: activeTab === 'stats' ? '#fff' : '#ccc',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Statistics
        </button>
      </div>

      {/* Pending Changes Tab */}
      {activeTab === 'pending' && (
        <div>
          <h2 style={{ color: '#ffaa00', marginBottom: '15px' }}>📋 Pending Changes</h2>
          
          {pendingChanges.length === 0 ? (
            <div style={{ 
              background: '#111', 
              border: '1px solid #666', 
              padding: '20px', 
              textAlign: 'center',
              color: '#888'
            }}>
              No pending changes to review.
            </div>
          ) : (
            <div style={{ background: '#111', border: '1px solid #666' }}>
              {pendingChanges.map((change, index) => (
                <div 
                  key={change.id} 
                  style={{ 
                    padding: '15px',
                    borderBottom: index < pendingChanges.length - 1 ? '1px solid #444' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ 
                        margin: '0 0 8px 0', 
                        color: '#6699ff',
                        fontSize: '14px'
                      }}>
                        {change.page?.title || 'Unknown Page'}
                      </h3>
                      
                      <div style={{ fontSize: '11px', color: '#ccc', marginBottom: '8px' }}>
                        <span>Edited by: {change.revision?.author?.display_name || 'Unknown'}</span>
                        <span style={{ margin: '0 10px', color: '#666' }}>•</span>
                        <span>{timeSince(change.created_at)}</span>
                        <span style={{ margin: '0 10px', color: '#666' }}>•</span>
                        <span>Rev #{change.revision?.revision_number}</span>
                      </div>

                      {change.revision?.edit_summary && (
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#ffaa00',
                          fontStyle: 'italic',
                          marginBottom: '8px'
                        }}>
                          "{change.revision.edit_summary}"
                        </div>
                      )}

                      <div style={{ fontSize: '11px', color: '#888' }}>
                        Content preview: {change.revision?.content?.substring(0, 150)}...
                      </div>
                    </div>

                    <div style={{ marginLeft: '15px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <button
                        onClick={() => setReviewingChange(change.id)}
                        style={{
                          padding: '4px 8px',
                          fontSize: '10px',
                          background: '#333',
                          border: '1px solid #666',
                          color: '#fff',
                          cursor: 'pointer'
                        }}
                      >
                        Review
                      </button>
                    </div>
                  </div>

                  {/* Review Modal */}
                  {reviewingChange === change.id && (
                    <div style={{ 
                      marginTop: '15px',
                      padding: '15px',
                      background: '#222',
                      border: '1px solid #666'
                    }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#ffaa00' }}>Review Change</h4>
                      
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px' }}>
                          Review Comment (optional):
                        </label>
                        <textarea
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="Add a comment about this review..."
                          style={{
                            width: '100%',
                            height: '60px',
                            padding: '4px',
                            fontSize: '11px',
                            background: '#fff',
                            border: '1px inset #c0c0c0',
                            resize: 'vertical'
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleReview(change.id, 'approved')}
                          style={{
                            padding: '6px 12px',
                            fontSize: '11px',
                            background: '#006600',
                            border: '1px solid #008800',
                            color: '#fff',
                            cursor: 'pointer'
                          }}
                        >
                          ✅ Approve
                        </button>
                        <button
                          onClick={() => handleReview(change.id, 'rejected')}
                          style={{
                            padding: '6px 12px',
                            fontSize: '11px',
                            background: '#660000',
                            border: '1px solid #880000',
                            color: '#fff',
                            cursor: 'pointer'
                          }}
                        >
                          ❌ Reject
                        </button>
                        <button
                          onClick={() => {
                            setReviewingChange(null)
                            setReviewComment('')
                          }}
                          style={{
                            padding: '6px 12px',
                            fontSize: '11px',
                            background: '#333',
                            border: '1px solid #666',
                            color: '#fff',
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recent Changes Tab */}
      {activeTab === 'recent' && (
        <div>
          <h2 style={{ color: '#ffaa00', marginBottom: '15px' }}>📝 Recent Changes</h2>
          
          <div style={{ background: '#111', border: '1px solid #666' }}>
            {recentChanges.map((revision, index) => (
              <div 
                key={revision.id}
                style={{ 
                  padding: '12px',
                  borderBottom: index < recentChanges.length - 1 ? '1px solid #444' : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                    <a 
                      href={`/wiki/${(revision as any).page?.slug || ''}`}
                      style={{ color: '#6699ff', textDecoration: 'none' }}
                      onClick={(e) => {
                        e.preventDefault()
                        if ((revision as any).page?.slug) {
                          window.location.href = `/wiki/${(revision as any).page.slug}`
                        }
                      }}
                    >
                      {(revision as any).page?.title || revision.title}
                    </a>
                    <span style={{ color: '#888', margin: '0 8px' }}>•</span>
                    <span style={{ color: '#ccc', fontSize: '11px' }}>
                      by {revision.author?.display_name || 'Unknown'}
                    </span>
                  </div>
                  
                  {revision.edit_summary && (
                    <div style={{ 
                      fontSize: '11px', 
                      color: '#ffaa00',
                      fontStyle: 'italic'
                    }}>
                      "{revision.edit_summary}"
                    </div>
                  )}
                </div>
                
                <div style={{ fontSize: '10px', color: '#888', textAlign: 'right' }}>
                  <div>{timeSince(revision.created_at)}</div>
                  <div>Rev #{revision.revision_number}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === 'stats' && (
        <div>
          <h2 style={{ color: '#ffaa00', marginBottom: '15px' }}>📊 Wiki Statistics</h2>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginBottom: '20px'
          }}>
            <div style={{ 
              background: '#111', 
              border: '1px solid #666', 
              padding: '15px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', color: '#6699ff', marginBottom: '5px' }}>
                {stats.totalPages}
              </div>
              <div style={{ fontSize: '12px', color: '#ccc' }}>
                Total Pages
              </div>
            </div>

            <div style={{ 
              background: '#111', 
              border: '1px solid #666', 
              padding: '15px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', color: '#ffaa00', marginBottom: '5px' }}>
                {stats.totalRevisions}
              </div>
              <div style={{ fontSize: '12px', color: '#ccc' }}>
                Total Revisions
              </div>
            </div>

            <div style={{ 
              background: '#111', 
              border: '1px solid #666', 
              padding: '15px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', color: '#ff6666', marginBottom: '5px' }}>
                {stats.totalUsers}
              </div>
              <div style={{ fontSize: '12px', color: '#ccc' }}>
                Registered Users
              </div>
            </div>

            <div style={{ 
              background: '#111', 
              border: '1px solid #666', 
              padding: '15px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', color: '#66ff66', marginBottom: '5px' }}>
                {stats.totalCategories}
              </div>
              <div style={{ fontSize: '12px', color: '#ccc' }}>
                Categories
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ background: '#111', border: '1px solid #666', padding: '15px' }}>
            <h3 style={{ color: '#ffaa00', marginBottom: '10px' }}>🔧 Quick Actions</h3>
            
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={loadAdminData}
                style={{
                  padding: '8px 12px',
                  fontSize: '11px',
                  background: '#333',
                  border: '1px solid #666',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                🔄 Refresh Data
              </button>
              
              <button
                onClick={() => window.open('/wiki/special-allpages', '_blank')}
                style={{
                  padding: '8px 12px',
                  fontSize: '11px',
                  background: '#333',
                  border: '1px solid #666',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                📄 View All Pages
              </button>
              
              <button
                onClick={() => window.open('/wiki/special-categories', '_blank')}
                style={{
                  padding: '8px 12px',
                  fontSize: '11px',
                  background: '#333',
                  border: '1px solid #666',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                📁 Manage Categories
              </button>
            </div>
          </div>

          {/* System Information */}
          <div style={{ 
            background: '#111', 
            border: '1px solid #666', 
            padding: '15px',
            marginTop: '15px'
          }}>
            <h3 style={{ color: '#ffaa00', marginBottom: '10px' }}>ℹ️ System Information</h3>
            
            <div style={{ fontSize: '11px', color: '#ccc' }}>
              <div style={{ marginBottom: '5px' }}>
                <strong>Wiki Version:</strong> Ballscord Wiki v1.0
              </div>
              <div style={{ marginBottom: '5px' }}>
                <strong>Database:</strong> Supabase PostgreSQL
              </div>
              <div style={{ marginBottom: '5px' }}>
                <strong>Last Updated:</strong> {formatDate(new Date().toISOString())}
              </div>
              <div>
                <strong>Admin Level:</strong> {userProfile?.is_admin ? 'Full Administrator' : 'Moderator'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}