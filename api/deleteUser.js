import admin from 'firebase-admin';

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, adminUid, idToken } = req.body;

    // Verify the ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    if (decodedToken.uid !== adminUid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if user is admin
    const adminDoc = await admin.firestore()
      .collection('users')
      .doc(adminUid)
      .get();

    if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete users' });
    }

    // Prevent self-deletion
    if (userId === adminUid) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Delete from Firebase Auth
    await admin.auth().deleteUser(userId);

    // Delete from Firestore
    await admin.firestore().collection('users').doc(userId).delete();

    return res.status(200).json({ 
      success: true, 
      message: 'User deleted successfully' 
    });

  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ 
      error: 'Failed to delete user', 
      details: error.message 
    });
  }
}