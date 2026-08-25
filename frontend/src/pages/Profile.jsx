import { useAuth } from '../context/AuthContext';
import AppLayout from '../layouts/AppLayout';

export default function Profile() {
  const { user } = useAuth();

  return (
    <AppLayout>
      <div className="page-header">
        <h2>Profile</h2>
      </div>

      <div className="card" style={{ maxWidth: 480 }}>
        <div className="profile-avatar">
          {user?.name?.[0]?.toUpperCase()}
        </div>
        <table className="detail-table" style={{ marginTop: '1.5rem' }}>
          <tbody>
            <tr>
              <th>Name</th>
              <td>{user?.name}</td>
            </tr>
            <tr>
              <th>Email</th>
              <td>{user?.email}</td>
            </tr>
            <tr>
              <th>Role</th>
              <td>
                <span className={`role-badge role-${user?.role?.toLowerCase()}`}>
                  {user?.role}
                </span>
              </td>
            </tr>
            <tr>
              <th>Member since</th>
              <td>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
