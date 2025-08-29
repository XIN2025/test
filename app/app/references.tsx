import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Button, Text, TextInput, View } from 'react-native';

export default function ReferencesScreen() {
  const [referenceName, setReferenceName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const router = useRouter();

  const handleSubmit = () => {
    if (!referenceName || !relationship || !contactInfo) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    // Navigate to dashboard with reference data
    router.push({
      pathname: '/dashboard/main',
      params: {
        referenceName,
        relationship,
        contactInfo,
      },
    });
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: 24, marginBottom: 24 }}>References</Text>
      <TextInput
        style={{
          width: 250,
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: 5,
          padding: 10,
          marginBottom: 16,
        }}
        placeholder='Reference Name'
        value={referenceName}
        onChangeText={setReferenceName}
      />
      <TextInput
        style={{
          width: 250,
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: 5,
          padding: 10,
          marginBottom: 16,
        }}
        placeholder='Relationship'
        value={relationship}
        onChangeText={setRelationship}
      />
      <TextInput
        style={{
          width: 250,
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: 5,
          padding: 10,
          marginBottom: 16,
        }}
        placeholder='Contact Info'
        value={contactInfo}
        onChangeText={setContactInfo}
      />
      <Button title='Submit' onPress={handleSubmit} />
    </View>
  );
}
