import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import admin from 'firebase-admin';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

// Delete User Endpoint
app.post('/api/deleteUser', async (req, res) => {
  try {
    const { userId, adminUid, idToken } = req.body;

    console.log('🔐 Verifying token for admin:', adminUid);

    // Verify the ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    if (decodedToken.uid !== adminUid) {
      console.log('❌ Token UID does not match admin UID');
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if user is admin
    const adminDoc = await admin.firestore()
      .collection('users')
      .doc(adminUid)
      .get();

    if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
      console.log('❌ User is not an admin');
      return res.status(403).json({ error: 'Only admins can delete users' });
    }

    // Prevent self-deletion
    if (userId === adminUid) {
      console.log('❌ Attempted self-deletion');
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    console.log('🗑️ Deleting user from Firebase Auth:', userId);
    await admin.auth().deleteUser(userId);

    console.log('🗑️ Deleting user from Firestore:', userId);
    await admin.firestore().collection('users').doc(userId).delete();

    console.log('✅ User deleted successfully');
    return res.status(200).json({ 
      success: true, 
      message: 'User deleted successfully' 
    });

  } catch (error) {
    console.error('💥 Delete user error:', error);
    return res.status(500).json({ 
      error: 'Failed to delete user', 
      details: error.message 
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Dev API server running on http://localhost:${PORT}`);
});